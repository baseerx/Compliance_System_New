from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.db import models
from django.contrib.auth.models import User
from department.models import Department  

class Letter(models.Model):
    sender = models.ForeignKey(
        Department,
        related_name="sent_letters",
        on_delete=models.CASCADE
    )

    receiver = models.ForeignKey(
        Department,
        related_name="received_letters",
        on_delete=models.CASCADE
    )
    category = models.CharField(max_length=50)
    priority = models.CharField(max_length=50)
    due_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("in-progress", "In Progress"),
        ("forwarded", "Forwarded"),
        ("completed", "Completed"),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="in-progress"
    )

    ref_no = models.CharField(max_length=50)
    subject = models.CharField(max_length=255)
    recurrence_value = models.IntegerField(null=True, blank=True)
    recurrence_type = models.CharField(
        max_length=10,
        choices=[
            ("days", "Days"),
            ("weeks", "Weeks"),
            ("months", "Months"),
            ("years", "Years"),
        ],
        null=True,
        blank=True
    )

    is_active = models.BooleanField(default=True)
    recurrence_metadata = models.JSONField(default=dict, blank=True)

    file = models.FileField(upload_to="letters/files/", null=True, blank=True)
    file_description = models.CharField(max_length=255, null=True, blank=True)

    next_due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def calculate_next_due_date(self, base_date=None):
        base = base_date or self.due_date
        if not base or not self.recurrence_type or not self.recurrence_value:
            return None

        if self.recurrence_type == "days":
            return base + timedelta(days=self.recurrence_value)
        if self.recurrence_type == "weeks":
            return base + timedelta(weeks=self.recurrence_value)
        if self.recurrence_type == "months":
            return base + relativedelta(months=self.recurrence_value)
        if self.recurrence_type == "years":
            return base + relativedelta(years=self.recurrence_value)

        return None

    def save(self, *args, **kwargs):
        if self.status:
            self.status = self.status.replace(" ", "-").lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.subject

    class Meta:
        ordering = ['-created_at']
        db_table = "documents"


class LetterCycle(models.Model):
    letter = models.ForeignKey(Letter, related_name="cycles", on_delete=models.CASCADE)
    cycle_no = models.IntegerField()
    due_date = models.DateField()
    next_due_date = models.DateField(null=True, blank=True)

    STATUS_CHOICES = [
        ("in-progress", "In Progress"),
        ("completed", "Completed"),
        ("overdue", "Overdue"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="")

    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("letter", "cycle_no")

    def save(self, *args, **kwargs):
        if self.status:
            self.status = self.status.replace(" ", "-").lower()
        super().save(*args, **kwargs)

    class Meta:
        db_table = "documents_cycle" 
    


class Log(models.Model):
    letter = models.ForeignKey(Letter, on_delete=models.CASCADE, related_name="logs")
    action = models.CharField(
        max_length=50,
        choices=[
            ("created", "Created"),
            ("updated", "Updated"),
            ("status_change", "Status Change"),
            ("recurred", "Recurred"),
            ("overdue", "Overdue"),
        ]
    )
    old_status = models.CharField(max_length=50, null=True, blank=True)
    new_status = models.CharField(max_length=50, null=True, blank=True)
    old_due_date = models.DateField(null=True, blank=True)
    new_due_date = models.DateField(null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "documents_log" 


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    letter = models.ForeignKey(Letter, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "documents_notification"


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name
