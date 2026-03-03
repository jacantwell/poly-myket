"""Tests for user endpoints: GET /users/me, PATCH /users/me, GET /users/me/profile."""


async def test_get_me(client, test_user):
    """GET /users/me returns the authenticated user's data."""
    resp = await client.get("/users/me")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["id"] == str(test_user.id), "should return the correct user id"
    assert data["email"] == "testuser@example.com", "should return correct email"
    assert data["display_name"] == "Test User", "should return correct display_name"
    assert data["image_url"] is None, "image_url should default to None"
    assert data["email_bet_created"] is True, "email_bet_created should default True"
    assert data["email_wager_placed"] is True, "email_wager_placed should default True"
    assert data["email_bet_resolved"] is True, "email_bet_resolved should default True"
    assert "created_at" in data, "should include created_at timestamp"


async def test_update_image_url(client):
    """PATCH /users/me with image_url updates the user's avatar."""
    resp = await client.patch(
        "/users/me",
        json={"image_url": "https://example.com/photo.jpg"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["image_url"] == "https://example.com/photo.jpg", (
        "image_url should be updated to the provided value"
    )

    # Verify change persists on subsequent read
    get_resp = await client.get("/users/me")
    assert get_resp.status_code == 200, get_resp.text
    assert get_resp.json()["image_url"] == "https://example.com/photo.jpg", (
        "updated image_url should persist across requests"
    )


async def test_update_email_preferences(client):
    """PATCH /users/me toggles email notification preferences."""
    resp = await client.patch(
        "/users/me",
        json={"email_bet_created": False},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["email_bet_created"] is False, (
        "email_bet_created should be set to False"
    )

    # Verify the change persists
    get_resp = await client.get("/users/me")
    assert get_resp.status_code == 200, get_resp.text
    assert get_resp.json()["email_bet_created"] is False, (
        "email_bet_created=False should persist across requests"
    )


async def test_partial_update_leaves_other_fields_unchanged(client):
    """PATCH /users/me with one field does not alter unrelated fields."""
    # First set image_url so we have a non-default value to verify
    await client.patch(
        "/users/me",
        json={"image_url": "https://example.com/avatar.png"},
    )

    # Now update only an email preference
    resp = await client.patch(
        "/users/me",
        json={"email_wager_placed": False},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["email_wager_placed"] is False, (
        "the targeted field should be updated"
    )
    assert data["image_url"] == "https://example.com/avatar.png", (
        "image_url should remain unchanged after unrelated update"
    )
    assert data["email_bet_created"] is True, (
        "email_bet_created should remain at its default"
    )
    assert data["email_bet_resolved"] is True, (
        "email_bet_resolved should remain at its default"
    )


async def test_profile_returns_membership_but_no_wagers(
    client, test_user, test_group
):
    """GET /users/me/profile returns the user, their memberships, and empty wagers."""
    resp = await client.get("/users/me/profile")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # User section
    assert data["user"]["id"] == str(test_user.id), (
        "profile user should match authenticated user"
    )

    # Memberships: test_user is admin of test_group
    assert len(data["memberships"]) == 1, (
        "test_user should have exactly 1 membership (test_group)"
    )
    membership = data["memberships"][0]
    assert membership["group_id"] == str(test_group.id), (
        "membership should reference the test_group"
    )
    assert membership["group_name"] == "Test Group", (
        "membership should include the group name"
    )
    assert membership["credit_balance"] == 100, (
        "membership should reflect starting credit balance"
    )
    assert membership["role"] == "admin", (
        "test_user should be admin of test_group"
    )

    # Wagers: none yet
    assert data["wagers"] == [], (
        "wagers list should be empty when no wagers have been placed"
    )


async def test_profile_with_bet_and_wager(client, test_user, test_group):
    """GET /users/me/profile includes wager data after placing a bet."""
    # Create a bet (which automatically places a YES wager for the creator)
    bet_resp = await client.post(
        f"/groups/{test_group.id}/bets",
        json={
            "subject_id": str(test_user.id),
            "description": "I will meditate daily",
            "initial_wager_amount": 10,
        },
    )
    assert bet_resp.status_code == 200, bet_resp.text
    bet = bet_resp.json()

    # Fetch profile
    profile_resp = await client.get("/users/me/profile")
    assert profile_resp.status_code == 200, profile_resp.text
    data = profile_resp.json()

    # Membership should reflect deducted credits
    assert len(data["memberships"]) == 1, (
        "test_user should still have exactly 1 membership"
    )
    assert data["memberships"][0]["credit_balance"] == 90, (
        "credit_balance should be 100 - 10 = 90 after wager"
    )

    # Wagers: the auto-created YES wager from bet creation
    assert len(data["wagers"]) == 1, (
        "test_user should have exactly 1 wager from bet creation"
    )
    wager = data["wagers"][0]
    assert wager["bet_id"] == bet["id"], (
        "wager should reference the created bet"
    )
    assert wager["amount"] == 10, "wager amount should be 10"
    assert wager["side"] == "yes", "initial wager side should be yes"

    # Nested bet info inside the wager
    assert wager["bet"]["id"] == bet["id"], (
        "nested bet id should match"
    )
    assert wager["bet"]["group_name"] == "Test Group", (
        "nested bet should include group name"
    )
    assert wager["bet"]["description"] == "I will meditate daily", (
        "nested bet should include description"
    )
    assert wager["bet"]["status"] == "open", (
        "bet status should still be open"
    )
