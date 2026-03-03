"""End-to-end credit math tests through the HTTP API.

Covers: group creation credits, join credits, bet creation deduction,
wager placement deduction, proportional payouts, no-winner refunds,
cancellation refunds, and decimal precision.
"""

from decimal import Decimal


def _get_member_balance(group_detail: dict, user_id: str) -> float:
    """Extract a member's credit_balance from a GET /groups/{id} response."""
    for member in group_detail["members"]:
        if member["user_id"] == user_id:
            return member["credit_balance"]
    raise AssertionError(
        f"user {user_id} not found in group members: "
        f"{[m['user_id'] for m in group_detail['members']]}"
    )


# -- 1. Starting credits on group create --


async def test_starting_credits_on_group_create(client, test_user):
    resp = await client.post(
        "/groups",
        json={"name": "Credit Test Group", "starting_credits": 250},
    )
    assert resp.status_code == 200, resp.text
    group = resp.json()

    detail_resp = await client.get(f"/groups/{group['id']}")
    assert detail_resp.status_code == 200, detail_resp.text
    detail = detail_resp.json()

    balance = _get_member_balance(detail, str(test_user.id))
    assert balance == 250, (
        f"creator should start with 250 credits, got {balance}"
    )


# -- 2. Starting credits on join --


async def test_starting_credits_on_join(
    client_factory, test_user, test_group, second_user
):
    async with client_factory(second_user) as c2:
        join_resp = await c2.post(
            "/groups/join", json={"invite_code": "TESTCODE"}
        )
        assert join_resp.status_code == 200, join_resp.text

    async with client_factory(test_user) as c1:
        detail_resp = await c1.get(f"/groups/{test_group.id}")
        assert detail_resp.status_code == 200, detail_resp.text
        detail = detail_resp.json()

    balance = _get_member_balance(detail, str(second_user.id))
    assert balance == 100, (
        f"joining member should receive group's starting_credits (100), "
        f"got {balance}"
    )


# -- 3. Bet creation deducts credits --


async def test_bet_creation_deducts_credits(client, test_user, test_group):
    resp = await client.post(
        f"/groups/{test_group.id}/bets",
        json={
            "subject_id": str(test_user.id),
            "description": "I will run 5km",
            "initial_wager_amount": 20,
        },
    )
    assert resp.status_code == 200, resp.text

    detail_resp = await client.get(f"/groups/{test_group.id}")
    detail = detail_resp.json()
    balance = _get_member_balance(detail, str(test_user.id))
    assert balance == 80, (
        f"creator balance should be 100 - 20 = 80, got {balance}"
    )


# -- 4. Wager placement deducts credits --


async def test_wager_placement_deducts_credits(
    client_factory, test_user, second_user, test_group
):
    # second_user joins the group
    async with client_factory(second_user) as c2:
        join_resp = await c2.post(
            "/groups/join", json={"invite_code": "TESTCODE"}
        )
        assert join_resp.status_code == 200, join_resp.text

    # test_user creates a bet
    async with client_factory(test_user) as c1:
        bet_resp = await c1.post(
            f"/groups/{test_group.id}/bets",
            json={
                "subject_id": str(test_user.id),
                "description": "I will read a book",
                "initial_wager_amount": 10,
            },
        )
        assert bet_resp.status_code == 200, bet_resp.text
        bet_id = bet_resp.json()["id"]

    # second_user places a NO wager
    async with client_factory(second_user) as c2:
        wager_resp = await c2.post(
            f"/bets/{bet_id}/wagers",
            json={"amount": 30, "side": "no"},
        )
        assert wager_resp.status_code == 200, wager_resp.text

    # Check balances
    async with client_factory(test_user) as c1:
        detail_resp = await c1.get(f"/groups/{test_group.id}")
        detail = detail_resp.json()

    balance = _get_member_balance(detail, str(second_user.id))
    assert balance == 70, (
        f"second_user balance should be 100 - 30 = 70, got {balance}"
    )


# -- 5. Proportional payout --


async def test_proportional_payout(
    client_factory, test_user, second_user, third_user, test_group
):
    # Join second and third users
    for user in [second_user, third_user]:
        async with client_factory(user) as c:
            resp = await c.post(
                "/groups/join", json={"invite_code": "TESTCODE"}
            )
            assert resp.status_code == 200, resp.text

    # A (test_user) creates bet with 20 YES
    async with client_factory(test_user) as c1:
        bet_resp = await c1.post(
            f"/groups/{test_group.id}/bets",
            json={
                "subject_id": str(test_user.id),
                "description": "Proportional payout bet",
                "initial_wager_amount": 20,
            },
        )
        assert bet_resp.status_code == 200, bet_resp.text
        bet_id = bet_resp.json()["id"]

    # B (second_user) wagers 30 YES
    async with client_factory(second_user) as c2:
        resp = await c2.post(
            f"/bets/{bet_id}/wagers",
            json={"amount": 30, "side": "yes"},
        )
        assert resp.status_code == 200, resp.text

    # C (third_user) wagers 50 NO
    async with client_factory(third_user) as c3:
        resp = await c3.post(
            f"/bets/{bet_id}/wagers",
            json={"amount": 50, "side": "no"},
        )
        assert resp.status_code == 200, resp.text

    # Balances after wagering: A=80, B=70, C=50
    # Resolve as success -> YES wins
    # Pool = 100, YES total = 50
    # A payout = (20/50)*100 = 40, B payout = (30/50)*100 = 60
    async with client_factory(test_user) as c1:
        resolve_resp = await c1.post(
            f"/bets/{bet_id}/resolve",
            json={"outcome": "success"},
        )
        assert resolve_resp.status_code == 200, resolve_resp.text

        detail_resp = await c1.get(f"/groups/{test_group.id}")
        detail = detail_resp.json()

    balance_a = _get_member_balance(detail, str(test_user.id))
    balance_b = _get_member_balance(detail, str(second_user.id))
    balance_c = _get_member_balance(detail, str(third_user.id))

    assert balance_a == 120, (
        f"A should have 80 + 40 = 120, got {balance_a}"
    )
    assert balance_b == 130, (
        f"B should have 70 + 60 = 130, got {balance_b}"
    )
    assert balance_c == 50, (
        f"C (loser) should stay at 50, got {balance_c}"
    )


# -- 6. No winners -> refund all --


async def test_no_winners_refund(
    client_factory, test_user, second_user, test_group
):
    async with client_factory(second_user) as c2:
        resp = await c2.post(
            "/groups/join", json={"invite_code": "TESTCODE"}
        )
        assert resp.status_code == 200, resp.text

    # test_user creates bet with 25 YES
    async with client_factory(test_user) as c1:
        bet_resp = await c1.post(
            f"/groups/{test_group.id}/bets",
            json={
                "subject_id": str(test_user.id),
                "description": "Everyone bets YES",
                "initial_wager_amount": 25,
            },
        )
        assert bet_resp.status_code == 200, bet_resp.text
        bet_id = bet_resp.json()["id"]

    # second_user also bets YES
    async with client_factory(second_user) as c2:
        resp = await c2.post(
            f"/bets/{bet_id}/wagers",
            json={"amount": 35, "side": "yes"},
        )
        assert resp.status_code == 200, resp.text

    # Resolve as fail -> winning side is NO, but nobody bet NO
    async with client_factory(test_user) as c1:
        resolve_resp = await c1.post(
            f"/bets/{bet_id}/resolve",
            json={"outcome": "fail"},
        )
        assert resolve_resp.status_code == 200, resolve_resp.text

        detail_resp = await c1.get(f"/groups/{test_group.id}")
        detail = detail_resp.json()

    balance_a = _get_member_balance(detail, str(test_user.id))
    balance_b = _get_member_balance(detail, str(second_user.id))

    assert balance_a == 100, (
        f"A should be refunded to 100, got {balance_a}"
    )
    assert balance_b == 100, (
        f"B should be refunded to 100, got {balance_b}"
    )


# -- 7. Cancel refunds all --


async def test_cancel_refunds_all(
    client_factory, test_user, second_user, test_group
):
    async with client_factory(second_user) as c2:
        resp = await c2.post(
            "/groups/join", json={"invite_code": "TESTCODE"}
        )
        assert resp.status_code == 200, resp.text

    async with client_factory(test_user) as c1:
        bet_resp = await c1.post(
            f"/groups/{test_group.id}/bets",
            json={
                "subject_id": str(test_user.id),
                "description": "Bet to cancel",
                "initial_wager_amount": 15,
            },
        )
        assert bet_resp.status_code == 200, bet_resp.text
        bet_id = bet_resp.json()["id"]

    async with client_factory(second_user) as c2:
        resp = await c2.post(
            f"/bets/{bet_id}/wagers",
            json={"amount": 40, "side": "no"},
        )
        assert resp.status_code == 200, resp.text

    # Cancel the bet
    async with client_factory(test_user) as c1:
        cancel_resp = await c1.post(f"/bets/{bet_id}/cancel")
        assert cancel_resp.status_code == 200, cancel_resp.text
        assert cancel_resp.json()["status"] == "cancelled"

        detail_resp = await c1.get(f"/groups/{test_group.id}")
        detail = detail_resp.json()

    balance_a = _get_member_balance(detail, str(test_user.id))
    balance_b = _get_member_balance(detail, str(second_user.id))

    assert balance_a == 100, (
        f"A should be refunded to 100, got {balance_a}"
    )
    assert balance_b == 100, (
        f"B should be refunded to 100, got {balance_b}"
    )


# -- 8. Decimal precision --


async def test_decimal_precision(
    client_factory, test_user, second_user, third_user, test_group
):
    for user in [second_user, third_user]:
        async with client_factory(user) as c:
            resp = await c.post(
                "/groups/join", json={"invite_code": "TESTCODE"}
            )
            assert resp.status_code == 200, resp.text

    # A bets 33.33 YES
    async with client_factory(test_user) as c1:
        bet_resp = await c1.post(
            f"/groups/{test_group.id}/bets",
            json={
                "subject_id": str(test_user.id),
                "description": "Decimal precision bet",
                "initial_wager_amount": 33.33,
            },
        )
        assert bet_resp.status_code == 200, bet_resp.text
        bet_id = bet_resp.json()["id"]

    # B bets 33.33 YES
    async with client_factory(second_user) as c2:
        resp = await c2.post(
            f"/bets/{bet_id}/wagers",
            json={"amount": 33.33, "side": "yes"},
        )
        assert resp.status_code == 200, resp.text

    # C bets 33.34 NO
    async with client_factory(third_user) as c3:
        resp = await c3.post(
            f"/bets/{bet_id}/wagers",
            json={"amount": 33.34, "side": "no"},
        )
        assert resp.status_code == 200, resp.text

    # Resolve success -> YES wins
    # Pool = 33.33 + 33.33 + 33.34 = 100.00
    # YES total = 66.66
    # A payout = (33.33 / 66.66) * 100.00 = 50.00 (exact)
    # B payout = (33.33 / 66.66) * 100.00 = 50.00 (exact)
    async with client_factory(test_user) as c1:
        resolve_resp = await c1.post(
            f"/bets/{bet_id}/resolve",
            json={"outcome": "success"},
        )
        assert resolve_resp.status_code == 200, resolve_resp.text

        detail_resp = await c1.get(f"/groups/{test_group.id}")
        detail = detail_resp.json()

    balance_a = _get_member_balance(detail, str(test_user.id))
    balance_b = _get_member_balance(detail, str(second_user.id))
    balance_c = _get_member_balance(detail, str(third_user.id))

    # Verify using Decimal math to avoid float comparison issues.
    # A: started 100, wagered 33.33 -> 66.67, payout 50.00 -> 116.67
    # B: started 100, wagered 33.33 -> 66.67, payout 50.00 -> 116.67
    # C: started 100, wagered 33.34 -> 66.66, no payout -> 66.66
    expected_a = Decimal("100") - Decimal("33.33") + Decimal("50.00")
    expected_b = Decimal("100") - Decimal("33.33") + Decimal("50.00")
    expected_c = Decimal("100") - Decimal("33.34")

    assert Decimal(str(balance_a)) == expected_a, (
        f"A balance should be {expected_a}, got {balance_a}"
    )
    assert Decimal(str(balance_b)) == expected_b, (
        f"B balance should be {expected_b}, got {balance_b}"
    )
    assert Decimal(str(balance_c)) == expected_c, (
        f"C balance should be {expected_c}, got {balance_c}"
    )

    # Total credits in the system should be conserved (300 total started)
    total = (
        Decimal(str(balance_a))
        + Decimal(str(balance_b))
        + Decimal(str(balance_c))
    )
    assert total == Decimal("300"), (
        f"total credits should be conserved at 300, got {total}"
    )
