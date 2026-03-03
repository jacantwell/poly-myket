"""Unit tests for app.services.email — the three email notification functions."""

import uuid
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from app.services.email import (
    send_bet_created_emails,
    send_bet_resolved_emails,
    send_wager_placed_email,
)


# ---------------------------------------------------------------------------
# Helpers to build lightweight stub objects
# ---------------------------------------------------------------------------


def _make_user(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        email="user@example.com",
        display_name="Some User",
        email_bet_created=True,
        email_wager_placed=True,
        email_bet_resolved=True,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_bet(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        group_id=uuid.uuid4(),
        description="Run a marathon by Friday",
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_group(**overrides):
    defaults = dict(name="Test Group")
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_member(user):
    return SimpleNamespace(user=user)


def _make_wager(user, *, side="yes", amount=Decimal("20"), **overrides):
    defaults = dict(
        id=uuid.uuid4(),
        user_id=user.id,
        amount=amount,
        side=SimpleNamespace(value=side),
        user=user,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ---------------------------------------------------------------------------
# send_bet_created_emails
# ---------------------------------------------------------------------------


class TestSendBetCreatedEmails:
    def test_skips_when_disabled(self, mock_resend):
        """When _is_enabled returns False, no batch email is sent."""
        with patch(
            "app.services.email._is_enabled", return_value=False
        ):
            creator = _make_user()
            other = _make_user(email="other@example.com")
            bet = _make_bet()
            group = _make_group()

            send_bet_created_emails(
                bet=bet,
                creator=creator,
                group=group,
                group_members_with_users=[
                    _make_member(creator),
                    _make_member(other),
                ],
            )

            mock_resend.Batch.send.assert_not_called()

    def test_skips_creator(self, mock_resend):
        """The bet creator should not receive an email."""
        creator = _make_user(email="creator@example.com")
        other = _make_user(email="other@example.com")
        bet = _make_bet()
        group = _make_group()

        send_bet_created_emails(
            bet=bet,
            creator=creator,
            group=group,
            group_members_with_users=[
                _make_member(creator),
                _make_member(other),
            ],
        )

        mock_resend.Batch.send.assert_called_once()
        emails = mock_resend.Batch.send.call_args[0][0]
        recipients = [e["to"] for e in emails]
        assert "creator@example.com" not in recipients, (
            "creator should be excluded from bet-created emails"
        )
        assert recipients == ["other@example.com"], (
            "only non-creator members should receive the email"
        )

    def test_respects_preferences(self, mock_resend):
        """A user with email_bet_created=False should not receive an email."""
        creator = _make_user(email="creator@example.com")
        opted_out = _make_user(
            email="optout@example.com", email_bet_created=False
        )
        opted_in = _make_user(email="optin@example.com")
        bet = _make_bet()
        group = _make_group()

        send_bet_created_emails(
            bet=bet,
            creator=creator,
            group=group,
            group_members_with_users=[
                _make_member(creator),
                _make_member(opted_out),
                _make_member(opted_in),
            ],
        )

        mock_resend.Batch.send.assert_called_once()
        emails = mock_resend.Batch.send.call_args[0][0]
        recipients = [e["to"] for e in emails]
        assert "optout@example.com" not in recipients, (
            "user with email_bet_created=False should be excluded"
        )
        assert recipients == ["optin@example.com"], (
            "only opted-in, non-creator members should receive the email"
        )


# ---------------------------------------------------------------------------
# send_wager_placed_email
# ---------------------------------------------------------------------------


class TestSendWagerPlacedEmail:
    def test_skips_when_wagerer_is_creator(self, mock_resend):
        """No email when the person who placed the wager is also the bet creator."""
        user = _make_user()
        bet = _make_bet()
        group = _make_group()
        wager = _make_wager(user)

        send_wager_placed_email(
            wager=wager,
            wagerer=user,
            bet=bet,
            bet_creator=user,
            group=group,
        )

        mock_resend.Emails.send.assert_not_called()

    def test_respects_preferences(self, mock_resend):
        """No email when the bet creator has email_wager_placed=False."""
        wagerer = _make_user(email="wagerer@example.com")
        creator = _make_user(
            email="creator@example.com", email_wager_placed=False
        )
        bet = _make_bet()
        group = _make_group()
        wager = _make_wager(wagerer)

        send_wager_placed_email(
            wager=wager,
            wagerer=wagerer,
            bet=bet,
            bet_creator=creator,
            group=group,
        )

        mock_resend.Emails.send.assert_not_called()

    def test_sends_to_creator(self, mock_resend):
        """Normal case: wagerer != creator and pref enabled sends an email."""
        wagerer = _make_user(email="wagerer@example.com")
        creator = _make_user(email="creator@example.com")
        bet = _make_bet()
        group = _make_group()
        wager = _make_wager(wagerer, amount=Decimal("50"))

        send_wager_placed_email(
            wager=wager,
            wagerer=wagerer,
            bet=bet,
            bet_creator=creator,
            group=group,
        )

        mock_resend.Emails.send.assert_called_once()
        email_params = mock_resend.Emails.send.call_args[0][0]
        assert email_params["to"] == "creator@example.com", (
            "email should be sent to the bet creator"
        )
        assert "50" in email_params["html"], (
            "email body should mention the wager amount"
        )


# ---------------------------------------------------------------------------
# send_bet_resolved_emails
# ---------------------------------------------------------------------------


class TestSendBetResolvedEmails:
    def test_deduplicates_recipients(self, mock_resend):
        """A user with multiple wagers on the same bet receives only one email."""
        user = _make_user(email="dup@example.com")
        bet = _make_bet()
        group = _make_group()
        wager1 = _make_wager(user, side="yes", amount=Decimal("10"))
        wager2 = _make_wager(user, side="no", amount=Decimal("5"))

        send_bet_resolved_emails(
            bet=bet,
            group=group,
            wagers_with_users=[wager1, wager2],
            winning_side="yes",
            payouts={str(user.id): Decimal("15")},
        )

        mock_resend.Batch.send.assert_called_once()
        emails = mock_resend.Batch.send.call_args[0][0]
        assert len(emails) == 1, (
            "duplicate user should only receive one email"
        )

    def test_winner_message(self, mock_resend):
        """A winner sees 'You won X credits!' in the email body."""
        user = _make_user(email="winner@example.com")
        bet = _make_bet()
        group = _make_group()
        wager = _make_wager(user, side="yes", amount=Decimal("20"))
        payout_amount = Decimal("35")

        send_bet_resolved_emails(
            bet=bet,
            group=group,
            wagers_with_users=[wager],
            winning_side="yes",
            payouts={str(user.id): payout_amount},
        )

        mock_resend.Batch.send.assert_called_once()
        email_html = mock_resend.Batch.send.call_args[0][0][0]["html"]
        assert "You won" in email_html, (
            "winner email should contain 'You won'"
        )
        assert "35.00" in email_html, (
            "winner email should show the payout amount"
        )

    def test_loser_message(self, mock_resend):
        """A loser sees 'You lost' in the email body when winners exist."""
        winner = _make_user(email="winner@example.com")
        loser = _make_user(email="loser@example.com")
        bet = _make_bet()
        group = _make_group()
        winner_wager = _make_wager(
            winner, side="yes", amount=Decimal("20")
        )
        loser_wager = _make_wager(
            loser, side="no", amount=Decimal("20")
        )

        send_bet_resolved_emails(
            bet=bet,
            group=group,
            wagers_with_users=[winner_wager, loser_wager],
            winning_side="yes",
            payouts={str(winner.id): Decimal("40")},
        )

        mock_resend.Batch.send.assert_called_once()
        emails = mock_resend.Batch.send.call_args[0][0]
        loser_email = next(
            e for e in emails if e["to"] == "loser@example.com"
        )
        assert "You lost" in loser_email["html"], (
            "loser email should contain 'You lost'"
        )

    def test_no_winners_refund_message(self, mock_resend):
        """When nobody won (empty/zero payouts), email says wager was refunded."""
        user = _make_user(email="refund@example.com")
        bet = _make_bet()
        group = _make_group()
        # User bet on the losing side but no winners exist at all
        wager = _make_wager(user, side="no", amount=Decimal("20"))

        send_bet_resolved_emails(
            bet=bet,
            group=group,
            wagers_with_users=[wager],
            winning_side="yes",
            payouts={},
        )

        mock_resend.Batch.send.assert_called_once()
        email_html = mock_resend.Batch.send.call_args[0][0][0]["html"]
        assert "refunded" in email_html, (
            "no-winners scenario should mention refund"
        )


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


class TestErrorHandling:
    def test_email_exception_does_not_propagate(self, mock_resend):
        """If resend.Batch.send raises, the function swallows the exception."""
        mock_resend.Batch.send.side_effect = RuntimeError("SMTP down")

        creator = _make_user(email="creator@example.com")
        other = _make_user(email="other@example.com")
        bet = _make_bet()
        group = _make_group()

        # Should not raise
        send_bet_created_emails(
            bet=bet,
            creator=creator,
            group=group,
            group_members_with_users=[
                _make_member(creator),
                _make_member(other),
            ],
        )
