from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Letter, LetterCycle, Log, Notification
from django.contrib.auth.models import User
import logging

logger = logging.getLogger(__name__)


@shared_task
def process_letters_and_recurrence():
    today = timezone.now().date()
    letters = (
        Letter.objects
        .exclude(status="draft")
        .exclude(due_date__isnull=True)
        .select_related("department", "created_by")
    )

    logger.info(f"Processing {letters.count()} letters")

    for letter in letters:
        days_left = (letter.due_date - today).days
        users = User.objects.all() 

        if letter.status == "completed" and letter.recurrence_value and letter.recurrence_type:
            try:
                next_due = letter.calculate_next_due_date()
            except Exception as e:
                logger.error(f"Recurrence failed for {letter.ref_no}: {e}")
                continue

            if not next_due:
                continue

            old_due = letter.due_date

            letter.status = "in-progress"
            letter.due_date = next_due
            letter.next_due_date = letter.calculate_next_due_date(next_due)
            letter.save(update_fields=["status", "due_date", "next_due_date"])

            Log.objects.create(
                letter=letter,
                action="recurred",
                old_due_date=old_due,
                new_due_date=letter.due_date,
                next_due_date=letter.next_due_date,
                message=f"Letter {letter.ref_no} automatically recurred"
            )

            for user in users:
                Notification.objects.create(
                    user=user,
                    letter=letter,
                    title="Letter Recurred",
                    message=f"Letter {letter.ref_no} has a new due date: {letter.due_date}"
                )

      
        else:
            if days_left < 0:
                title = "Letter Overdue"
                message = f"Letter {letter.ref_no} is overdue by {-days_left} day(s)."
            elif days_left == 0:
                title = "Due Today"
                message = f"Letter {letter.ref_no} is due today."
            elif days_left in (1, 2, 3):
                title = "Due Soon"
                message = f"Letter {letter.ref_no} is due in {days_left} day(s)."
            else:
                continue

            for user in users:
                Notification.objects.get_or_create(
                    user=user,
                    letter=letter,
                    title=title,
                    defaults={"message": message}
                )

    return f"Processed {letters.count()} letters"


@shared_task
def cleanup_old_notifications(days=30):
    cutoff_date = timezone.now() - timedelta(days=days)
    deleted_count, _ = Notification.objects.filter(
        created_at__lt=cutoff_date
    ).delete()
    return f"Deleted {deleted_count} old notifications"
