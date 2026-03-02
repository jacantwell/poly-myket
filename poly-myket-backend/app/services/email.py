import logging
from decimal import Decimal

import resend

from app.config import settings
from app.models.bet import Bet
from app.models.group import Group, GroupMember
from app.models.user import User
from app.models.wager import Wager

logger = logging.getLogger(__name__)


def _is_enabled() -> bool:
    return bool(settings.resend_api_key)


def _bet_url(group_id: str, bet_id: str) -> str:
    return f"{settings.frontend_url}/groups/{group_id}/bets/{bet_id}"


def send_bet_created_emails(
    bet: Bet,
    creator: User,
    group: Group,
    group_members_with_users: list[GroupMember],
) -> None:
    if not _is_enabled():
        return

    resend.api_key = settings.resend_api_key
    bet_link = _bet_url(str(bet.group_id), str(bet.id))

    emails: list[resend.Emails.SendParams] = []
    for member in group_members_with_users:
        user = member.user
        if user.id == creator.id:
            continue
        if not user.email_bet_created:
            continue
        emails.append({
            "from": settings.email_from,
            "to": user.email,
            "subject": f"New bet in {group.name}",
            "html": (
                f"<p><strong>{creator.display_name}</strong> created a new bet "
                f"in <strong>{group.name}</strong>:</p>"
                f"<p><em>{bet.description}</em></p>"
                f'<p><a href="{bet_link}">View bet</a></p>'
            ),
        })

    if not emails:
        return

    try:
        resend.Batch.send(emails)
    except Exception:
        logger.exception("Failed to send bet-created emails for bet %s", bet.id)


def send_wager_placed_email(
    wager: Wager,
    wagerer: User,
    bet: Bet,
    bet_creator: User,
    group: Group,
) -> None:
    if not _is_enabled():
        return

    if wagerer.id == bet_creator.id:
        return

    if not bet_creator.email_wager_placed:
        return

    resend.api_key = settings.resend_api_key
    bet_link = _bet_url(str(bet.group_id), str(bet.id))

    try:
        resend.Emails.send({
            "from": settings.email_from,
            "to": bet_creator.email,
            "subject": f"New wager on your bet in {group.name}",
            "html": (
                f"<p><strong>{wagerer.display_name}</strong> wagered "
                f"<strong>{wager.amount}</strong> credits ({wager.side.value.upper()}) "
                f"on your bet in <strong>{group.name}</strong>:</p>"
                f"<p><em>{bet.description}</em></p>"
                f'<p><a href="{bet_link}">View bet</a></p>'
            ),
        })
    except Exception:
        logger.exception("Failed to send wager-placed email for wager %s", wager.id)


def send_bet_resolved_emails(
    bet: Bet,
    group: Group,
    wagers_with_users: list[Wager],
    winning_side: str,
    payouts: dict[str, Decimal],
) -> None:
    if not _is_enabled():
        return

    resend.api_key = settings.resend_api_key
    bet_link = _bet_url(str(bet.group_id), str(bet.id))

    # Deduplicate by user id
    seen_user_ids: set[str] = set()
    emails: list[resend.Emails.SendParams] = []

    for wager in wagers_with_users:
        user = wager.user
        user_id_str = str(user.id)
        if user_id_str in seen_user_ids:
            continue
        seen_user_ids.add(user_id_str)

        if not user.email_bet_resolved:
            continue

        payout = payouts.get(user_id_str)
        if payout is not None and payout > 0:
            result_text = f"You won <strong>{payout:.2f}</strong> credits!"
        elif wager.side.value == winning_side:
            result_text = "You won! Credits have been distributed."
        else:
            result_text = "You lost this bet. Better luck next time!"

        # If no winners existed (all refunded)
        no_winners = all(p == 0 or p is None for p in payouts.values()) if payouts else True
        if no_winners and payout is None:
            result_text = "No winners — your wager has been refunded."

        emails.append({
            "from": settings.email_from,
            "to": user.email,
            "subject": f"Bet resolved in {group.name}",
            "html": (
                f"<p>A bet in <strong>{group.name}</strong> has been resolved:</p>"
                f"<p><em>{bet.description}</em></p>"
                f"<p>{result_text}</p>"
                f'<p><a href="{bet_link}">View results</a></p>'
            ),
        })

    if not emails:
        return

    try:
        resend.Batch.send(emails)
    except Exception:
        logger.exception("Failed to send bet-resolved emails for bet %s", bet.id)
