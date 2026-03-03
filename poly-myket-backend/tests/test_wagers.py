"""Tests for wager placement, credit deduction, and creator restrictions."""

import uuid as uuid_mod
from datetime import UTC, datetime, timedelta

from sqlalchemy import update

from app.models.bet import Bet


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_self_bet(client, group_id, user_id, initial_wager=20):
    """Create a self-bet and return the bet response dict."""
    resp = await client.post(
        f"/groups/{group_id}/bets",
        json={
            "subject_id": str(user_id),
            "description": "I will run 5km",
            "initial_wager_amount": initial_wager,
        },
    )
    assert resp.status_code == 200, f"Failed to create bet: {resp.text}"
    return resp.json()


async def _join_group(client_factory, user, invite_code="TESTCODE"):
    """Have a user join the test group via invite code."""
    async with client_factory(user) as c:
        resp = await c.post("/groups/join", json={"invite_code": invite_code})
        assert resp.status_code == 200, f"Failed to join group: {resp.text}"
        return resp.json()


async def _place_wager(client, bet_id, amount, side):
    """Place a wager and return the raw response."""
    return await client.post(
        f"/bets/{bet_id}/wagers",
        json={"amount": amount, "side": side},
    )


async def _get_group_detail(client, group_id):
    """Fetch group detail (includes members with credit_balance)."""
    resp = await client.get(f"/groups/{group_id}")
    assert resp.status_code == 200, f"Failed to get group: {resp.text}"
    return resp.json()


def _find_member(group_detail, user_id):
    """Find a member dict by user_id inside a GroupDetail response."""
    for m in group_detail["members"]:
        if m["user_id"] == str(user_id):
            return m
    return None


# ---------------------------------------------------------------------------
# Basic wager placement
# ---------------------------------------------------------------------------


async def test_place_yes_wager(
    client, client_factory, test_user, second_user, test_group
):
    """Placing a YES wager returns 200 with correct fields."""
    bet = await _create_self_bet(client, test_group.id, test_user.id)
    await _join_group(client_factory, second_user)

    async with client_factory(second_user) as c:
        resp = await _place_wager(c, bet["id"], 30, "yes")

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["bet_id"] == bet["id"], "wager should reference the correct bet"
    assert data["user_id"] == str(second_user.id), "wager should belong to the placing user"
    assert data["amount"] == 30, "wager amount should match the request"
    assert data["side"] == "yes", "wager side should be YES"
    assert "id" in data, "response should include a wager id"
    assert "created_at" in data, "response should include created_at"


async def test_place_no_wager(
    client, client_factory, test_user, second_user, test_group
):
    """Placing a NO wager returns 200 with side='no'."""
    bet = await _create_self_bet(client, test_group.id, test_user.id)
    await _join_group(client_factory, second_user)

    async with client_factory(second_user) as c:
        resp = await _place_wager(c, bet["id"], 15, "no")

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["side"] == "no", "wager side should be NO"
    assert data["amount"] == 15, "wager amount should match the request"


# ---------------------------------------------------------------------------
# Credit deduction
# ---------------------------------------------------------------------------


async def test_wager_deducts_credits(
    client, client_factory, test_user, second_user, test_group
):
    """Placing a wager reduces the member's credit_balance by the wager amount."""
    bet = await _create_self_bet(client, test_group.id, test_user.id, initial_wager=20)
    await _join_group(client_factory, second_user)

    # second_user starts with 100 credits (group starting_credits)
    async with client_factory(second_user) as c:
        resp = await _place_wager(c, bet["id"], 30, "yes")
        assert resp.status_code == 200, f"Wager failed: {resp.text}"

    # Check credit balance via group detail (use test_user who is admin)
    group_detail = await _get_group_detail(client, test_group.id)
    member = _find_member(group_detail, second_user.id)
    assert member is not None, "second_user should be a group member"
    assert member["credit_balance"] == 70, (
        "second_user should have 100 - 30 = 70 credits remaining"
    )


# ---------------------------------------------------------------------------
# Validation errors
# ---------------------------------------------------------------------------


async def test_insufficient_credits(
    client, client_factory, test_user, second_user, test_group
):
    """Wagering more than available credits returns 400."""
    bet = await _create_self_bet(client, test_group.id, test_user.id)
    await _join_group(client_factory, second_user)

    async with client_factory(second_user) as c:
        resp = await _place_wager(c, bet["id"], 999, "yes")

    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert "Insufficient credits" in resp.json()["detail"], (
        "error should mention insufficient credits"
    )


async def test_zero_amount(
    client, client_factory, test_user, second_user, test_group
):
    """Wagering amount=0 returns 400 with 'must be positive' message."""
    bet = await _create_self_bet(client, test_group.id, test_user.id)
    await _join_group(client_factory, second_user)

    async with client_factory(second_user) as c:
        resp = await _place_wager(c, bet["id"], 0, "yes")

    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert "Wager amount must be positive" in resp.json()["detail"], (
        "error should say wager amount must be positive"
    )


async def test_negative_amount(
    client, client_factory, test_user, second_user, test_group
):
    """Wagering a negative amount returns 400."""
    bet = await _create_self_bet(client, test_group.id, test_user.id)
    await _join_group(client_factory, second_user)

    async with client_factory(second_user) as c:
        resp = await _place_wager(c, bet["id"], -10, "no")

    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert "Wager amount must be positive" in resp.json()["detail"], (
        "error should say wager amount must be positive"
    )


# ---------------------------------------------------------------------------
# Authorization
# ---------------------------------------------------------------------------


async def test_non_member_rejected(
    client, client_factory, test_user, second_user, test_group
):
    """A user not in the group gets 403 when trying to wager."""
    bet = await _create_self_bet(client, test_group.id, test_user.id)
    # second_user does NOT join the group

    async with client_factory(second_user) as c:
        resp = await _place_wager(c, bet["id"], 10, "yes")

    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
    assert "Not a member" in resp.json()["detail"], (
        "error should indicate user is not a group member"
    )


async def test_bet_not_open_rejected(
    client, client_factory, test_user, second_user, test_group
):
    """Wagering on a resolved bet returns 400."""
    bet = await _create_self_bet(client, test_group.id, test_user.id)
    await _join_group(client_factory, second_user)

    # Resolve the bet first
    resolve_resp = await client.post(
        f"/bets/{bet['id']}/resolve",
        json={"outcome": "success"},
    )
    assert resolve_resp.status_code == 200, f"Resolve failed: {resolve_resp.text}"

    # Now try to place a wager on the resolved bet
    async with client_factory(second_user) as c:
        resp = await _place_wager(c, bet["id"], 10, "yes")

    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert "Bet is not open" in resp.json()["detail"], (
        "error should indicate the bet is not open"
    )


# ---------------------------------------------------------------------------
# Creator restrictions (self-bet)
# ---------------------------------------------------------------------------


async def test_creator_yes_within_window(client, test_user, test_group):
    """Creator can place an additional YES wager within the 2-hour window."""
    bet = await _create_self_bet(client, test_group.id, test_user.id, initial_wager=10)

    # Creator places another YES wager (within 2-hour window by default)
    resp = await _place_wager(client, bet["id"], 15, "yes")

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["side"] == "yes", "creator should be allowed to bet YES"
    assert data["amount"] == 15, "wager amount should match"


async def test_creator_no_rejected(client, test_user, test_group):
    """Creator cannot bet NO on their own self-bet."""
    bet = await _create_self_bet(client, test_group.id, test_user.id, initial_wager=10)

    resp = await _place_wager(client, bet["id"], 5, "no")

    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
    assert "Creator can only bet YES" in resp.json()["detail"], (
        "error should indicate creator can only bet YES"
    )


async def test_creator_locked_after_2hrs(
    client, test_user, test_group, db_session
):
    """Creator is fully locked out from wagering after the 2-hour window."""
    bet = await _create_self_bet(client, test_group.id, test_user.id, initial_wager=10)
    bet_id = bet["id"]

    # Move created_at to 3 hours ago so the window has expired
    await db_session.execute(
        update(Bet)
        .where(Bet.id == uuid_mod.UUID(bet_id))
        .values(created_at=datetime.now(UTC) - timedelta(hours=3))
    )
    await db_session.commit()

    # Even a YES wager should be rejected now
    resp = await _place_wager(client, bet_id, 5, "yes")

    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
    assert "Betting window closed" in resp.json()["detail"], (
        "error should indicate the betting window is closed"
    )
