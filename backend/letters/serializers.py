from rest_framework import serializers
from .models import Letter, Notification, Log, LetterCycle, Category
from department.models import Department
import json
from django.utils import timezone
  
class LetterSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    receiver_name = serializers.CharField(source='receiver.name', read_only=True)
    class Meta:
        model = Letter
        fields = "__all__"
        extra_kwargs = {
            'sender': {'write_only': True},
            'receiver': {'write_only': True},
        }    



    def validate_recurrence_metadata(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return {}
        return value or {}

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if not data.get('sender_name'):
            data['sender_name'] = instance.sender.name if instance.sender else None
        if not data.get('receiver_name'):
            data['receiver_name'] = instance.receiver.name if instance.receiver else None

        if not instance.next_due_date:
            next_due = instance.calculate_next_due_date()
            data["next_due_date"] = (
                next_due.isoformat() if next_due else None
            )

        return data

    def get_file_url(self, obj):
        return obj.file.url if obj.file else None
    
class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "user_name",
            "letter",
            "title",
            "message",
            "is_read",
            "created_at",
            "time_ago",
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

class LogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Log
        fields = "__all__"


class LetterCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = LetterCycle
        fields = "__all__"


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]
