from rest_framework import serializers
from django.utils import timezone
from datetime import date as date_type
import re, json

from .models import Letter, Notification, Log, LetterCycle, Category
from department.models import Department


RECURRENCE_PATTERN_CHOICES = [
    ("daily",   "Daily"),
    ("weekly",  "Weekly"),
    ("monthly", "Monthly"),
    ("yearly",  "Yearly"),
    ("monthly_day",   "Specific Day of Each Month"),
    ("first_weekday", "First Weekday of Every Month"),
    ("quarterly",     "Quarterly"),
    
]

VALID_RECURRENCE_TYPES = {k for k, _ in RECURRENCE_PATTERN_CHOICES}
RECURRENCE_LIMITS = {
    "daily":   365,
    "weekly":  52,
    "monthly": 24,
    "yearly":  10,
}

ALLOWED_FILE_EXTENSIONS = {".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_MB = 5


class LetterSerializer(serializers.ModelSerializer):
    sender_name        = serializers.CharField(source="sender.name",            read_only=True)
    receiver_name      = serializers.CharField(source="receiver.name",          read_only=True)
    assigned_to_name   = serializers.CharField(source="assigned_to.username",   read_only=True)
    assigned_head_name = serializers.CharField(source="assigned_head.username", read_only=True)
    created_by_name    = serializers.CharField(source="created_by.username",    read_only=True)
    is_active = serializers.BooleanField(read_only=True)


    class Meta:
        model  = Letter
        fields = "__all__"
        extra_kwargs = {
            "sender":        {"write_only": True},
            "receiver":      {"write_only": True},
            "assigned_to":   {"write_only": True, "required": False},
            "assigned_head": {"write_only": True, "required": False},
            "created_by":    {"write_only": True, "required": False},
            "ref_no":           {"required": False, "allow_blank": True},
            "file_description": {"required": False, "allow_blank": True},
        }

    
    def create(self, validated_data):
        validated_data["is_active"] = True
        return super().create(validated_data)    

    def validate_ref_no(self, value):
        value = value.strip()
        if not value:
            return value  
        if len(value) > 50:
            raise serializers.ValidationError("Reference number must be 50 characters or fewer.")
        if not re.match(r'^[a-zA-Z0-9\-/._()#\s]+$', value):
            raise serializers.ValidationError("...")
        return value


    def validate_subject(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Subject is required.")
        if len(value) > 150:
            raise serializers.ValidationError("Subject must be 150 characters or fewer.")
        if re.search(r'[\U00010000-\U0010FFFF]', value):
            raise serializers.ValidationError("Emojis are not allowed in the subject field.")
        return value

    def validate_recurrence_metadata(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return {}
        return value or {}

    def validate_recurrence_type(self, value):
        if value and value not in VALID_RECURRENCE_TYPES:
            raise serializers.ValidationError(
                f"Invalid recurrence type '{value}'. "
                f"Valid choices: {sorted(VALID_RECURRENCE_TYPES)}"
            )
        return value

    def validate(self, data):
        recurrence_type  = data.get("recurrence_type") or getattr(self.instance, "recurrence_type", None)
        recurrence_value = data.get("recurrence_value") or getattr(self.instance, "recurrence_value", 1) or 1
        recurrence_meta  = data.get("recurrence_metadata") or getattr(self.instance, "recurrence_metadata", {}) or {}
        due_date         = data.get("due_date") or getattr(self.instance, "due_date", None)

        if due_date and due_date < date_type.today():
            raise serializers.ValidationError(
                {"due_date": "Due date cannot be earlier than today."}
            )

        if recurrence_type and recurrence_type in RECURRENCE_LIMITS:
            limit = RECURRENCE_LIMITS[recurrence_type]
            if recurrence_value > limit:
                raise serializers.ValidationError(
                    {"recurrence_value": f"'{recurrence_type}' recurrence cannot exceed {limit}."}
                )

        return data

    def to_representation(self, instance):
        data = super().to_representation(instance)

        data["sender_name"]        = instance.sender.name        if instance.sender        else None
        data["receiver_name"]      = instance.receiver.name      if instance.receiver      else None
        data["assigned_to_name"]   = instance.assigned_to.username   if instance.assigned_to   else None
        data["assigned_head_name"] = instance.assigned_head.username if instance.assigned_head  else None
        data["created_by_name"]    = instance.created_by.username    if instance.created_by     else None

        if not instance.next_due_date:
            next_due = instance.calculate_next_due_date()
            data["next_due_date"] = next_due.isoformat() if next_due else None

        return data
    


class LetterCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LetterCycle
        fields = "__all__"


class LogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Log
        fields = "__all__"


class NotificationSerializer(serializers.ModelSerializer):
    time_ago  = serializers.SerializerMethodField()
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model  = Notification
        fields = [
            "id", "user", "user_name", "letter",
            "title", "message", "is_read", "created_at", "time_ago",
        ]
        read_only_fields = ["created_at"]

    def get_time_ago(self, obj):
        diff = timezone.now() - obj.created_at
        if diff.days:
            return f"{diff.days} day(s) ago"
        hours = diff.seconds // 3600
        if hours:
            return f"{hours} hr(s) ago"
        minutes = diff.seconds // 60
        if minutes:
            return f"{minutes} min ago"
        return "Just now"


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ["id", "name"]