from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from .models import Letter, LetterCycle, Log, Notification
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def process_letters_and_recurrence():
    today = timezone.now().date()

    letters = (
        Letter.objects
        .filter(status="in-progress")
        .exclude(due_date__isnull=True)
        .select_related("created_by", "assigned_to", "assigned_head")
        .prefetch_related("cycles")
    )

    logger.info(f"Processing {letters.count()} in-progress letters")

    for letter in letters:

        overdue_cycles = letter.cycles.filter(status="in-progress", due_date__lt=today)
        for cycle in overdue_cycles:
            cycle.status = "overdue"
            cycle.save(update_fields=["status"])
            Log.objects.create(
                letter=letter,
                action="overdue",
                message=f"Cycle {cycle.cycle_no} automatically marked overdue.",
            )

       
        active_cycle = letter.cycles.filter(status="in-progress").order_by("-cycle_no").first()
        check_date   = active_cycle.due_date if active_cycle else letter.due_date

        if not check_date:
            continue

        days_left = (check_date - today).days

        if days_left < 0:
            title   = "Letter Overdue"
            message = f"Letter {letter.ref_no} is overdue by {-days_left} day(s)."
        elif days_left == 0:
            title   = "Due Today"
            message = f"Letter {letter.ref_no} is due today."
        elif days_left in (1, 2, 3):
            title   = "Due Soon"
            message = f"Letter {letter.ref_no} is due in {days_left} day(s)."
        else:
            continue

        recipients = set()
        if letter.assigned_to:   recipients.add(letter.assigned_to)
        if letter.assigned_head: recipients.add(letter.assigned_head)
        if letter.created_by:    recipients.add(letter.created_by)

        for user in recipients:
            Notification.objects.get_or_create(
                user=user,
                letter=letter,
                title=title,
                defaults={"message": message},
            )

    return f"Processed {letters.count()} letters"


@shared_task
def cleanup_old_notifications(days=30):
    cutoff = timezone.now() - timedelta(days=days)
    deleted_count, _ = Notification.objects.filter(created_at__lt=cutoff).delete()
    return f"Deleted {deleted_count} old notifications"