from datetime import timedelta, date
from dateutil.relativedelta import relativedelta
from django.db import models
from django.contrib.auth import get_user_model
from department.models import Department

User = get_user_model()


RECURRENCE_PATTERN_CHOICES = [
    ("daily",   "Daily"),
    ("weekly",  "Weekly"),
    ("monthly", "Monthly"),
    ("yearly",  "Yearly"),
    ("monthly_day",    "Specific Day of Each Month"),
    ("first_weekday",  "First Weekday of Every Month"),
    ("quarterly",    "Quarterly "),

]


class Letter(models.Model):

    department = models.ForeignKey(Department, on_delete=models.CASCADE)

    category = models.CharField(max_length=50)
    priority = models.CharField(max_length=50)
    due_date = models.DateField(null=True, blank=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_letters"
    )
    assigned_to = models.ForeignKey(
        User, related_name="assigned_letters",
        on_delete=models.SET_NULL, null=True, blank=True
    )
    assigned_head = models.ForeignKey(
        User, related_name="head_letters",
        on_delete=models.SET_NULL, null=True, blank=True
    )

    STATUS_CHOICES = [
        ("draft",       "Draft"),
        ("pending",     "Pending Approval"),
        ("in-progress", "In Progress"),
        ("forwarded",   "Forwarded"),
        ("completed",   "Completed"),
        ("rejected",    "Rejected"),
    ]
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )

    ref_no  = models.CharField(max_length=50)
    subject = models.CharField(max_length=255)

    recurrence_type = models.CharField(
        max_length=30,
        choices=RECURRENCE_PATTERN_CHOICES,
        null=True, blank=True,
    )
    recurrence_value    = models.IntegerField(null=True, blank=True)
    recurrence_metadata = models.JSONField(default=dict, blank=True)

    is_active = models.BooleanField(default=True)

    file             = models.FileField(upload_to="letters/files/", null=True, blank=True)
    file_description = models.CharField(max_length=255, null=True, blank=True)

    next_due_date = models.DateField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def calculate_next_due_date(self, base_date=None):
        base: date = base_date or self.due_date
        if not base or not self.recurrence_type:
            return None

        interval = self.recurrence_value or 1

        if self.recurrence_type == "daily":
            return base + timedelta(days=interval)

        if self.recurrence_type == "weekly":
            return base + timedelta(weeks=interval)

        if self.recurrence_type == "monthly":
            return base + relativedelta(months=interval)

        if self.recurrence_type == "yearly":
            return base + relativedelta(years=interval)
        if self.recurrence_type == "monthly_day":
            day = (self.recurrence_metadata or {}).get("day", 1)
            next_month = base + relativedelta(months=1)
        
            last_day = (next_month.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
            return next_month.replace(day=min(day, last_day.day))

        if self.recurrence_type == "first_weekday":

            weekday = (self.recurrence_metadata or {}).get("weekday", 0)
            first_of_next = (base + relativedelta(months=1)).replace(day=1)
            days_until = (weekday - first_of_next.weekday()) % 7
            return first_of_next + timedelta(days=days_until)

        if self.recurrence_type == "quarterly":
            return base + relativedelta(months=3)

        return None

    def save(self, *args, **kwargs):
        if self.status:
            self.status = self.status.replace(" ", "-").lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.subject

    class Meta:
        ordering = ["-created_at"]
        db_table = "documents"


class LetterCycle(models.Model):
    letter   = models.ForeignKey(Letter, related_name="cycles", on_delete=models.CASCADE)
    cycle_no = models.IntegerField()
    due_date = models.DateField()
    next_due_date = models.DateField(null=True, blank=True)

    STATUS_CHOICES = [
        ("in-progress", "In Progress"),
        ("completed",   "Completed"),
        ("overdue",     "Overdue"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="in-progress")

    completed_at = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.status:
            self.status = self.status.replace(" ", "-").lower()
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ("letter", "cycle_no")
        db_table = "documents_cycle"


class Log(models.Model):
    letter = models.ForeignKey(Letter, on_delete=models.CASCADE, related_name="logs")
    action = models.CharField(
        max_length=50,
        choices=[
            ("created",       "Created"),
            ("updated",       "Updated"),
            ("status_change", "Status Change"),
            ("recurred",      "Recurred"),
            ("overdue",       "Overdue"),
            ("approved",      "Approved"),
            ("rejected",      "Rejected"),
        ]
    )
    old_status    = models.CharField(max_length=50, null=True, blank=True)
    new_status    = models.CharField(max_length=50, null=True, blank=True)
    old_due_date  = models.DateField(null=True, blank=True)
    new_due_date  = models.DateField(null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    message       = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "documents_log"


class Notification(models.Model):
    user    = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    letter  = models.ForeignKey(Letter, on_delete=models.CASCADE, null=True, blank=True)
    title   = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "documents_notification"


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name
    
class LetterComment(models.Model):
    letter     = models.ForeignKey(Letter, on_delete=models.CASCADE, related_name="comments")
    user       = models.ForeignKey(User, on_delete=models.CASCADE)  # ← change this
    comment    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering   = ["-created_at"]
        db_table   = "documents_comment"   # good practice to set explicitly

    def __str__(self):
        return f"Comment by {self.user.username} on Letter {self.letter_id}"