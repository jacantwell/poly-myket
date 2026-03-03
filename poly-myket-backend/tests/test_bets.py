"""Tests for bet creation, resolution, cancellation, and authorization."""

import uuid

import pytest
from httpx import AsyncClient

from app.models.user import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _join_group(client_factory, user: User, invite_code: str) -> None:
    """Have *user* join a group via its invite code."""
    async with client_factory(user) as c:
        resp = await c.post("/groups/join", json={"invite_code": invite_code})
        assert resp.status_code == 200, f"join failed: {resp.text}"


async def _create_bet(
    client: AsyncClient,
    group_id: uuid.UUID,
    subject_id: uuid.UUID,
    *,
    initial_wager_amount: float = 20,
    description: str = "test bet",
) -> dict:
    """Create a bet and return the parsed response body."""
    resp = await client.post(
        f"/groups/{group_id}/bets",
        json={
            "subject_id": str(subject_id),
            "description": description,
            "initial_wager_amount": initial_wager_amount,
        },
    )
    return resp


async def _place_wager(
    client: AsyncClient,
    bet_id: uuid.UUID,
    *,
    amount: float = 30,
    side: str = "no",
) -> dict:
    """Place a wager on a bet and return the response."""
    resp = await client.post(
        f"/bets/{bet_id}/wagers",
        json={"amount": amount, "side": side},
    )
    return resp



def _balance_for_user(group_detail: dict, user_id: uuid.UUID) -> float:
    """Extract a specific user's credit_balance from a group detail response."""
    for member in group_detail["members"]:
        if member["user_id"] == str(user_id):
            return member["credit_balance"]
    raise ValueError(f"User {user_id} not found in group members")


# ---------------------------------------------------------------------------
# Creation tests
# ---------------------------------------------------------------------------


async def test_create_bet_self_bet(client, test_user, test_group):
    """Creator creates a bet about themselves -- should succeed."""
    resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=20
    )
    assert resp.status_code == 200, f"unexpected status: {resp.text}"
    data = resp.json()
    assert data["subject_id"] == str(test_user.id)
    assert data["created_by"] == str(test_user.id)
    assert data["description"] == "test bet"
    assert data["status"] == "open"


async def test_create_bet_not_self_rejects(
    client, test_user, second_user, test_group
):
    """Setting subject_id to someone else should be rejected with 400."""
    resp = await _create_bet(
        client, test_group.id, second_user.id, initial_wager_amount=20
    )
    assert resp.status_code == 400, f"expected 400, got {resp.status_code}"
    assert "yourself" in resp.json()["detail"].lower()


async def test_create_bet_insufficient_credits(client, test_user, test_group):
    """Wagering more than the user's credit balance should be rejected."""
    resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=999
    )
    assert resp.status_code == 400, f"expected 400, got {resp.status_code}"
    assert "insufficient" in resp.json()["detail"].lower()


async def test_create_bet_creates_initial_wager(
    client, test_user, test_group
):
    """After creation the bet should have exactly one YES wager."""
    resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=25
    )
    assert resp.status_code == 200
    data = resp.json()
    wagers = data["wagers"]
    assert len(wagers) == 1, "bet should have exactly one initial wager"
    assert wagers[0]["side"] == "yes"
    assert wagers[0]["amount"] == 25
    assert wagers[0]["user_id"] == str(test_user.id)


async def test_create_bet_non_member_rejects(
    client_factory, second_user, test_group
):
    """A user who is not a group member cannot create a bet in that group."""
    async with client_factory(second_user) as c:
        resp = await _create_bet(
            c, test_group.id, second_user.id, initial_wager_amount=10
        )
    assert resp.status_code == 403, f"expected 403, got {resp.status_code}"


# ---------------------------------------------------------------------------
# Resolution tests
# ---------------------------------------------------------------------------


async def test_resolve_success_distributes_credits(
    client, client_factory, test_user, second_user, test_group
):
    """Resolving with outcome=success distributes the pool to YES wagers."""
    # Setup: second_user joins and places a NO wager
    await _join_group(client_factory, second_user, "TESTCODE")

    # test_user creates bet with 20 initial YES wager (balance: 100 -> 80)
    create_resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=20
    )
    assert create_resp.status_code == 200
    bet_id = create_resp.json()["id"]

    # second_user places 30 NO wager (balance: 100 -> 70)
    async with client_factory(second_user) as c2:
        wager_resp = await _place_wager(c2, bet_id, amount=30, side="no")
        assert wager_resp.status_code == 200, wager_resp.text

    # Resolve as success -- YES side wins, total pool=50, test_user gets all
    resolve_resp = await client.post(
        f"/bets/{bet_id}/resolve", json={"outcome": "success"}
    )
    assert resolve_resp.status_code == 200, resolve_resp.text

    # Check balances: test_user should get the full pool (50) added to 80
    group_detail = await client.get(f"/groups/{test_group.id}")
    test_balance = _balance_for_user(group_detail.json(), test_user.id)
    assert test_balance == pytest.approx(
        130, abs=0.01
    ), "winner should receive entire pool (80 + 50 = 130)"

    second_balance = _balance_for_user(group_detail.json(), second_user.id)
    assert second_balance == pytest.approx(
        70, abs=0.01
    ), "loser keeps their remaining balance (70)"


async def test_resolve_fail_distributes_credits(
    client, client_factory, test_user, second_user, test_group
):
    """Resolving with outcome=fail distributes the pool to NO wagers."""
    await _join_group(client_factory, second_user, "TESTCODE")

    create_resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=20
    )
    assert create_resp.status_code == 200
    bet_id = create_resp.json()["id"]

    async with client_factory(second_user) as c2:
        wager_resp = await _place_wager(c2, bet_id, amount=30, side="no")
        assert wager_resp.status_code == 200, wager_resp.text

    # Resolve as fail -- NO side wins, second_user gets full pool (50)
    resolve_resp = await client.post(
        f"/bets/{bet_id}/resolve", json={"outcome": "fail"}
    )
    assert resolve_resp.status_code == 200, resolve_resp.text

    group_detail = await client.get(f"/groups/{test_group.id}")
    test_balance = _balance_for_user(group_detail.json(), test_user.id)
    assert test_balance == pytest.approx(
        80, abs=0.01
    ), "loser keeps remaining balance (80)"

    second_balance = _balance_for_user(group_detail.json(), second_user.id)
    assert second_balance == pytest.approx(
        120, abs=0.01
    ), "winner should receive entire pool (70 + 50 = 120)"


async def test_resolve_no_winners_refunds(
    client, client_factory, test_user, second_user, test_group
):
    """When all wagers are on the losing side, everyone is refunded."""
    await _join_group(client_factory, second_user, "TESTCODE")

    # Both users bet YES
    create_resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=20
    )
    assert create_resp.status_code == 200
    bet_id = create_resp.json()["id"]

    async with client_factory(second_user) as c2:
        wager_resp = await _place_wager(c2, bet_id, amount=30, side="yes")
        assert wager_resp.status_code == 200, wager_resp.text

    # Resolve as fail -- NO side wins, but nobody bet NO -> refund all
    resolve_resp = await client.post(
        f"/bets/{bet_id}/resolve", json={"outcome": "fail"}
    )
    assert resolve_resp.status_code == 200, resolve_resp.text

    group_detail = await client.get(f"/groups/{test_group.id}")
    test_balance = _balance_for_user(group_detail.json(), test_user.id)
    assert test_balance == pytest.approx(
        100, abs=0.01
    ), "should be refunded to original balance"

    second_balance = _balance_for_user(group_detail.json(), second_user.id)
    assert second_balance == pytest.approx(
        100, abs=0.01
    ), "should be refunded to original balance"


async def test_resolve_sets_status_and_timestamp(
    client, test_user, test_group
):
    """After resolution the bet status and resolved_at should be set."""
    create_resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=10
    )
    assert create_resp.status_code == 200
    bet_id = create_resp.json()["id"]

    resolve_resp = await client.post(
        f"/bets/{bet_id}/resolve", json={"outcome": "success"}
    )
    assert resolve_resp.status_code == 200
    data = resolve_resp.json()
    assert data["status"] == "resolved_success"
    assert data["resolved_at"] is not None, "resolved_at should be set"


async def test_resolve_stores_proof_image(client, test_user, test_group):
    """proof_image_url provided in the resolve body is persisted on the bet."""
    create_resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=10
    )
    assert create_resp.status_code == 200
    bet_id = create_resp.json()["id"]

    proof_url = "https://example.com/proof.jpg"
    resolve_resp = await client.post(
        f"/bets/{bet_id}/resolve",
        json={"outcome": "success", "proof_image_url": proof_url},
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["proof_image_url"] == proof_url


# ---------------------------------------------------------------------------
# Authorization tests
# ---------------------------------------------------------------------------


async def test_creator_can_resolve(
    client_factory, test_user, second_user, test_group
):
    """The bet creator (even if not admin) can resolve their own bet."""
    # second_user joins and creates a bet (they are MEMBER, not ADMIN)
    await _join_group(client_factory, second_user, "TESTCODE")

    async with client_factory(second_user) as c2:
        create_resp = await _create_bet(
            c2, test_group.id, second_user.id, initial_wager_amount=10
        )
        assert create_resp.status_code == 200, create_resp.text
        bet_id = create_resp.json()["id"]

        # second_user (creator, member) resolves their own bet
        resolve_resp = await c2.post(
            f"/bets/{bet_id}/resolve", json={"outcome": "success"}
        )
        assert resolve_resp.status_code == 200, (
            f"creator should be able to resolve: {resolve_resp.text}"
        )


async def test_admin_can_resolve(
    client, client_factory, test_user, second_user, test_group
):
    """A group admin can resolve any bet, even one they did not create."""
    await _join_group(client_factory, second_user, "TESTCODE")

    # second_user creates a bet
    async with client_factory(second_user) as c2:
        create_resp = await _create_bet(
            c2, test_group.id, second_user.id, initial_wager_amount=10
        )
        assert create_resp.status_code == 200, create_resp.text
        bet_id = create_resp.json()["id"]

    # test_user (admin) resolves second_user's bet
    resolve_resp = await client.post(
        f"/bets/{bet_id}/resolve", json={"outcome": "fail"}
    )
    assert resolve_resp.status_code == 200, (
        f"admin should be able to resolve: {resolve_resp.text}"
    )


async def test_non_admin_non_creator_cannot_resolve(
    client, client_factory, test_user, second_user, test_group
):
    """A regular member who didn't create the bet cannot resolve it."""
    await _join_group(client_factory, second_user, "TESTCODE")

    # test_user (admin) creates a bet
    create_resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=10
    )
    assert create_resp.status_code == 200
    bet_id = create_resp.json()["id"]

    # second_user (member, not creator) tries to resolve
    async with client_factory(second_user) as c2:
        resolve_resp = await c2.post(
            f"/bets/{bet_id}/resolve", json={"outcome": "success"}
        )
    assert resolve_resp.status_code == 403, (
        f"expected 403, got {resolve_resp.status_code}"
    )


async def test_resolve_already_resolved_returns_400(
    client, test_user, test_group
):
    """Resolving an already-resolved bet should return 400."""
    create_resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=10
    )
    assert create_resp.status_code == 200
    bet_id = create_resp.json()["id"]

    # First resolve succeeds
    resp1 = await client.post(
        f"/bets/{bet_id}/resolve", json={"outcome": "success"}
    )
    assert resp1.status_code == 200

    # Second resolve should fail
    resp2 = await client.post(
        f"/bets/{bet_id}/resolve", json={"outcome": "fail"}
    )
    assert resp2.status_code == 400, (
        f"expected 400 for double resolve, got {resp2.status_code}"
    )
    assert "not open" in resp2.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Cancellation tests
# ---------------------------------------------------------------------------


async def test_cancel_refunds_wagers(
    client, client_factory, test_user, second_user, test_group
):
    """Cancelling a bet refunds all wager amounts to the participants."""
    await _join_group(client_factory, second_user, "TESTCODE")

    create_resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=20
    )
    assert create_resp.status_code == 200
    bet_id = create_resp.json()["id"]

    async with client_factory(second_user) as c2:
        wager_resp = await _place_wager(c2, bet_id, amount=30, side="no")
        assert wager_resp.status_code == 200, wager_resp.text

    # Cancel the bet
    cancel_resp = await client.post(f"/bets/{bet_id}/cancel")
    assert cancel_resp.status_code == 200, cancel_resp.text

    # Both users should be back to their starting credits (100)
    group_detail = await client.get(f"/groups/{test_group.id}")
    test_balance = _balance_for_user(group_detail.json(), test_user.id)
    assert test_balance == pytest.approx(
        100, abs=0.01
    ), "creator should be refunded to 100"

    second_balance = _balance_for_user(group_detail.json(), second_user.id)
    assert second_balance == pytest.approx(
        100, abs=0.01
    ), "wagerer should be refunded to 100"


async def test_cancel_sets_status(client, test_user, test_group):
    """After cancellation the bet status should be CANCELLED."""
    create_resp = await _create_bet(
        client, test_group.id, test_user.id, initial_wager_amount=10
    )
    assert create_resp.status_code == 200
    bet_id = create_resp.json()["id"]

    cancel_resp = await client.post(f"/bets/{bet_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"
