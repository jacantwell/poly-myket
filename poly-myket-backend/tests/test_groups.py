"""Tests for group CRUD, joining, and admin operations."""

from httpx import AsyncClient

from app.models import Group, User


# ---------------------------------------------------------------------------
# Create group
# ---------------------------------------------------------------------------


async def test_create_group(client: AsyncClient):
    resp = await client.post(
        "/groups", json={"name": "My Group", "starting_credits": 200}
    )
    assert resp.status_code == 200, f"unexpected status: {resp.text}"
    data = resp.json()
    assert data["name"] == "My Group", "group name should match request"
    assert len(data["invite_code"]) == 8, "invite code should be 8 chars"
    assert data["starting_credits"] == 200, "starting_credits should match"


async def test_create_group_creator_is_admin(client: AsyncClient):
    resp = await client.post(
        "/groups", json={"name": "Admin Check", "starting_credits": 50}
    )
    group_id = resp.json()["id"]

    detail_resp = await client.get(f"/groups/{group_id}")
    assert detail_resp.status_code == 200, f"unexpected status: {detail_resp.text}"
    members = detail_resp.json()["members"]
    assert len(members) == 1, "should have exactly one member (the creator)"
    assert members[0]["role"] == "admin", "creator should be admin"


async def test_create_group_starting_credits_applied(client: AsyncClient):
    resp = await client.post(
        "/groups", json={"name": "Credit Check", "starting_credits": 250}
    )
    group_id = resp.json()["id"]

    detail_resp = await client.get(f"/groups/{group_id}")
    members = detail_resp.json()["members"]
    assert (
        members[0]["credit_balance"] == 250
    ), "creator should receive starting_credits"


# ---------------------------------------------------------------------------
# Join group
# ---------------------------------------------------------------------------


async def test_join_group_valid_code(
    client: AsyncClient,
    client_factory,
    test_group: Group,
    second_user: User,
):
    async with client_factory(second_user) as c2:
        resp = await c2.post(
            "/groups/join", json={"invite_code": "TESTCODE"}
        )
    assert resp.status_code == 200, f"unexpected status: {resp.text}"
    assert resp.json()["id"] == str(test_group.id), "should return the joined group"


async def test_join_group_invalid_code(client: AsyncClient, test_group: Group):
    resp = await client.post(
        "/groups/join", json={"invite_code": "BADCODE1"}
    )
    assert resp.status_code == 404, "invalid invite code should return 404"


async def test_join_group_idempotent(
    client: AsyncClient,
    client_factory,
    test_group: Group,
    second_user: User,
):
    async with client_factory(second_user) as c2:
        resp1 = await c2.post(
            "/groups/join", json={"invite_code": "TESTCODE"}
        )
    async with client_factory(second_user) as c2:
        resp2 = await c2.post(
            "/groups/join", json={"invite_code": "TESTCODE"}
        )
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json()["id"] == resp2.json()["id"], (
        "joining the same group twice should return the same group"
    )

    # Verify only one membership was created
    async with client_factory(second_user) as c2:
        detail = await c2.get(f"/groups/{test_group.id}")
    members = detail.json()["members"]
    second_user_members = [
        m for m in members if m["user_id"] == str(second_user.id)
    ]
    assert len(second_user_members) == 1, (
        "should not create duplicate membership"
    )


async def test_join_group_gets_starting_credits(
    client: AsyncClient,
    client_factory,
    test_group: Group,
    second_user: User,
):
    async with client_factory(second_user) as c2:
        await c2.post("/groups/join", json={"invite_code": "TESTCODE"})

    # Check the member's credit_balance via group detail
    detail_resp = await client.get(f"/groups/{test_group.id}")
    members = detail_resp.json()["members"]
    new_member = next(
        m for m in members if m["user_id"] == str(second_user.id)
    )
    assert new_member["credit_balance"] == 100, (
        "new member should receive the group's starting_credits"
    )


# ---------------------------------------------------------------------------
# List / Detail
# ---------------------------------------------------------------------------


async def test_list_groups_only_members(
    client: AsyncClient,
    client_factory,
    test_group: Group,
    second_user: User,
):
    # second_user is NOT a member of test_group yet
    async with client_factory(second_user) as c2:
        resp = await c2.get("/groups")
    assert resp.status_code == 200
    assert resp.json() == [], "non-member should see no groups"


async def test_get_group_detail(
    client: AsyncClient,
    test_group: Group,
    test_user: User,
):
    resp = await client.get(f"/groups/{test_group.id}")
    assert resp.status_code == 200, f"unexpected status: {resp.text}"
    data = resp.json()
    assert data["name"] == "Test Group"
    assert "members" in data, "detail response should include members"
    assert len(data["members"]) >= 1, "should have at least one member"


async def test_get_group_non_member_403(
    client_factory,
    test_group: Group,
    second_user: User,
):
    async with client_factory(second_user) as c2:
        resp = await c2.get(f"/groups/{test_group.id}")
    assert resp.status_code == 403, "non-member should be forbidden"


# ---------------------------------------------------------------------------
# Admin operations
# ---------------------------------------------------------------------------


def _find_member(members: list[dict], user_id: str) -> dict:
    """Helper to locate a member dict by user_id."""
    return next(m for m in members if m["user_id"] == user_id)


async def test_adjust_credits(
    client: AsyncClient,
    client_factory,
    test_group: Group,
    test_user: User,
    second_user: User,
):
    # second_user joins the group first
    async with client_factory(second_user) as c2:
        await c2.post("/groups/join", json={"invite_code": "TESTCODE"})

    # Get member_id for second_user
    detail = await client.get(f"/groups/{test_group.id}")
    member = _find_member(detail.json()["members"], str(second_user.id))
    member_id = member["id"]

    # Positive adjustment
    resp = await client.post(
        f"/groups/{test_group.id}/adjust-credits",
        json={"member_id": member_id, "amount": 50, "reason": "bonus"},
    )
    assert resp.status_code == 200, f"unexpected status: {resp.text}"
    assert resp.json()["amount"] == 50

    # Negative adjustment
    resp2 = await client.post(
        f"/groups/{test_group.id}/adjust-credits",
        json={"member_id": member_id, "amount": -30, "reason": "penalty"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["amount"] == -30

    # Verify final balance: 100 (starting) + 50 - 30 = 120
    detail2 = await client.get(f"/groups/{test_group.id}")
    updated_member = _find_member(
        detail2.json()["members"], str(second_user.id)
    )
    assert updated_member["credit_balance"] == 120, (
        "balance should reflect both adjustments"
    )


async def test_adjust_credits_non_admin_403(
    client: AsyncClient,
    client_factory,
    test_group: Group,
    test_user: User,
    second_user: User,
):
    # second_user joins (as member, not admin)
    async with client_factory(second_user) as c2:
        await c2.post("/groups/join", json={"invite_code": "TESTCODE"})

    # Get test_user's member_id
    detail = await client.get(f"/groups/{test_group.id}")
    admin_member = _find_member(
        detail.json()["members"], str(test_user.id)
    )

    # second_user (non-admin) tries to adjust credits
    async with client_factory(second_user) as c2:
        resp = await c2.post(
            f"/groups/{test_group.id}/adjust-credits",
            json={
                "member_id": admin_member["id"],
                "amount": 999,
                "reason": "cheating",
            },
        )
    assert resp.status_code == 403, "non-admin should not adjust credits"


async def test_promote_member(
    client: AsyncClient,
    client_factory,
    test_group: Group,
    second_user: User,
):
    # second_user joins
    async with client_factory(second_user) as c2:
        await c2.post("/groups/join", json={"invite_code": "TESTCODE"})

    # Get member_id
    detail = await client.get(f"/groups/{test_group.id}")
    member = _find_member(detail.json()["members"], str(second_user.id))
    assert member["role"] == "member", "should start as member"

    # Admin promotes
    resp = await client.post(
        f"/groups/{test_group.id}/promote",
        json={"member_id": member["id"]},
    )
    assert resp.status_code == 200, f"unexpected status: {resp.text}"
    assert resp.json()["role"] == "admin", "member should now be admin"


async def test_promote_non_admin_403(
    client: AsyncClient,
    client_factory,
    test_group: Group,
    test_user: User,
    second_user: User,
    third_user: User,
):
    # second_user and third_user join
    async with client_factory(second_user) as c2:
        await c2.post("/groups/join", json={"invite_code": "TESTCODE"})
    async with client_factory(third_user) as c3:
        await c3.post("/groups/join", json={"invite_code": "TESTCODE"})

    # Get third_user's member_id
    detail = await client.get(f"/groups/{test_group.id}")
    third_member = _find_member(
        detail.json()["members"], str(third_user.id)
    )

    # second_user (non-admin) tries to promote third_user
    async with client_factory(second_user) as c2:
        resp = await c2.post(
            f"/groups/{test_group.id}/promote",
            json={"member_id": third_member["id"]},
        )
    assert resp.status_code == 403, "non-admin should not promote members"
