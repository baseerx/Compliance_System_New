from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from django.utils import timezone
import json, os, jwt

from django.contrib.auth import get_user_model
User = get_user_model()

from .models import Letter, LetterCycle, Log, Notification, Category
from .serializers import (
    LetterSerializer,
    LetterCycleSerializer,
    LogSerializer,
    NotificationSerializer,
    CategorySerializer,
)

ALLOWED_FILE_EXTENSIONS = {".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_MB = 5


def _validate_file(file):
    if not file:
        return None
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        return (
            f"File type '{ext}' is not allowed. "
            f"Allowed types: {', '.join(sorted(ALLOWED_FILE_EXTENSIONS))}"
        )
    size_mb = file.size / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return f"File size ({size_mb:.1f} MB) exceeds the {MAX_FILE_SIZE_MB} MB limit."
    return None


def _decode_token_payload(request):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip()
    if not token:
        return {}
    try:
        return jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"],
            options={"verify_signature": False},
        )
    except Exception:
        return {}


def _get_user_from_request(request):
    payload  = _decode_token_payload(request)
    username = payload.get("username")
    if not username:
        return None
    try:
        return User.objects.get(username=username)
    except User.DoesNotExist:
        return None


def get_user_from_token(request):
    user = _get_user_from_request(request)
    if user is None:
        raise AuthenticationFailed("Invalid or missing token.")
    return user


def _user_from_payload(request):
    return _get_user_from_request(request)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def create_letter(request):
    try:
        data = request.data.copy()
        username = data.pop("username", None)
        if isinstance(username, list) and username:
            username = username[0]
        data.pop("current_date", None)

        if not data.get("status") or data.get("status") == "":
            data["status"] = "pending"

        raw_meta = data.get("recurrence_metadata")
        if raw_meta:
            try:
                parsed = json.loads(raw_meta)
                data["recurrence_metadata"] = json.dumps(parsed)
            except Exception:
                data["recurrence_metadata"] = "{}"
        else:
            data["recurrence_metadata"] = "{}"

        uploaded_file = request.FILES.get("file")
        if uploaded_file:
            file_error = _validate_file(uploaded_file)
            if file_error:
                return Response({"file": [file_error]}, status=400)

        serializer = LetterSerializer(data=data)

        if serializer.is_valid():
            created_by = None
            if username:
                try:
                    created_by = User.objects.get(username=username)
                except User.DoesNotExist:
                    pass
            if not created_by:
                created_by = User.objects.first()
                if not created_by:
                    return Response({"error": "No users found in database."}, status=400)

            letter = serializer.save(created_by=created_by)

            if letter.status == "in-progress":
                try:
                    letter.next_due_date = letter.calculate_next_due_date()
                    letter.save(update_fields=["next_due_date"])
                except Exception as e:
                    print("Next due date error:", e)

                if letter.due_date:
                    LetterCycle.objects.create(
                        letter=letter, cycle_no=1,
                        due_date=letter.due_date,
                        next_due_date=letter.next_due_date,
                        status="in-progress",
                    )
                    Log.objects.create(
                        letter=letter, action="created",
                        message=f"Initial cycle created for {letter.ref_no}",
                        new_due_date=letter.due_date,
                        next_due_date=letter.next_due_date,
                    )
            else:
                Log.objects.create(
                    letter=letter, action="created",
                    message=f"Task {letter.ref_no} created with status '{letter.status}'",
                )
                if letter.assigned_head and letter.status == "pending":
                    Notification.objects.create(
                        user=letter.assigned_head, letter=letter,
                        title="New Task Pending Approval",
                        message=(
                            f"Task {letter.ref_no} – '{letter.subject}' "
                            "has been submitted for your approval."
                        ),
                    )

            return Response(LetterSerializer(letter).data, status=201)
        return Response(serializer.errors, status=400)

    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e), "detail": "Internal server error"}, status=500)


@api_view(["POST"])
def approve_letter(request, pk):
    try:
        letter = get_object_or_404(Letter, pk=pk)
        user   = get_user_from_token(request)

        if not (user.is_superuser or letter.assigned_head == user):
            return Response({"error": "Only the assigned head can approve."}, status=403)
        if letter.status != "pending":
            return Response({"error": "Task is not pending."}, status=400)

        letter.status = "in-progress"
        try:
            letter.next_due_date = letter.calculate_next_due_date()
        except Exception:
            letter.next_due_date = None
        letter.save()

        if letter.due_date:
            LetterCycle.objects.create(
                letter=letter, cycle_no=1,
                due_date=letter.due_date,
                next_due_date=letter.next_due_date,
                status="in-progress",
            )

        Log.objects.create(
            letter=letter, action="approved",
            old_status="pending", new_status="in-progress",
            message=f"Task approved by {user.username}. First cycle created.",
        )

        if letter.assigned_to:
            Notification.objects.create(
                user=letter.assigned_to, letter=letter,
                title="Task Approved",
                message=(
                    f"Task {letter.ref_no} – '{letter.subject}' has been approved "
                    f"and is now in progress. Due: {letter.due_date}"
                ),
            )

        return Response({"message": "Task approved and moved to in-progress."})

    except AuthenticationFailed as e:
        return Response({"error": str(e)}, status=401)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def reject_letter(request, pk):
    try:
        letter = get_object_or_404(Letter, pk=pk)
        user   = get_user_from_token(request)

        if not (user.is_superuser or letter.assigned_head == user):
            return Response({"error": "Only the assigned head can reject."}, status=403)
        if letter.status != "pending":
            return Response({"error": "Only pending letters can be rejected."}, status=400)

        rejection_reason = request.data.get("reason", "")
        letter.status = "draft"
        letter.save()

        Log.objects.create(
            letter=letter, action="rejected",
            old_status="pending", new_status="draft",
            message=(
                f"Task rejected by {user.username}."
                + (f" Reason: {rejection_reason}" if rejection_reason else "")
            ),
        )

        recipients = set()
        if letter.created_by:  recipients.add(letter.created_by)
        if letter.assigned_to: recipients.add(letter.assigned_to)

        for recipient in recipients:
            Notification.objects.create(
                user=recipient, letter=letter,
                title="Task Rejected",
                message=(
                    f"Task {letter.ref_no} – '{letter.subject}' was rejected"
                    + (f": {rejection_reason}" if rejection_reason else ".")
                    + " It has been returned to drafts."
                ),
            )

        return Response({"message": "Task rejected and moved to draft."})

    except AuthenticationFailed as e:
        return Response({"error": str(e)}, status=401)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def list_letters(request):
    try:
        user = _get_user_from_request(request)
        if user is None:
            return Response({"error": "Authentication required."}, status=401)

        if user.is_superuser:
            letters = Letter.objects.filter(assigned_head=user, status="pending" ,is_active=True)
        else:
            letters = Letter.objects.filter(assigned_to=user ,is_active=True)

        data = []
        for letter in letters:
            cycles = letter.cycles.all().order_by("cycle_no")
            base = {
                "letter_id":        str(letter.id),
                "id":               letter.id,
                "ref_no":           letter.ref_no,
                "subject":          letter.subject,
                "sender":           letter.sender.name   if letter.sender   else "N/A",
                "receiver":         letter.receiver.name if letter.receiver else "N/A",
                "category":         letter.category,
                "priority":         letter.priority,
                "file":             letter.file.url if letter.file else None,
                "created_by":       letter.created_by.username    if letter.created_by    else "N/A",
                "assigned_to":      letter.assigned_to.username   if letter.assigned_to   else None,
                "assigned_head":    letter.assigned_head.username if letter.assigned_head else None,
                "recurrence_type":  letter.recurrence_type,
                "recurrence_value": letter.recurrence_value,
            }
            if cycles.exists():
                for cycle in cycles:
                    data.append({
                        **base,
                        "_id":           str(cycle.id),
                        "cycle_no":      cycle.cycle_no,
                        "due_date":      cycle.due_date.isoformat(),
                        "next_due_date": cycle.next_due_date.isoformat() if cycle.next_due_date else None,
                        "status":        cycle.status,
                    })
            else:
                data.append({
                    **base,
                    "_id":           str(letter.id),
                    "cycle_no":      1,
                    "due_date":      letter.due_date.isoformat() if letter.due_date else None,
                    "next_due_date": letter.next_due_date.isoformat() if letter.next_due_date else None,
                    "status":        letter.status,
                })

        return Response(data)

    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_letter(request, pk):
    letter = get_object_or_404(Letter, pk=pk)
    return Response(LetterSerializer(letter).data)


@api_view(["PATCH", "PUT"])
@parser_classes([MultiPartParser, FormParser])
def update_letter(request, pk):
    try:
        letter   = get_object_or_404(Letter, pk=pk)
        payload  = _decode_token_payload(request)
        username = payload.get("username")

        if username:
            req_user = User.objects.filter(username=username).first()
            if req_user:
                is_owner = (letter.created_by == req_user or letter.assigned_to == req_user)
                if not req_user.is_superuser and not is_owner:
                    return Response({"error": "Permission denied."}, status=403)

        data = request.data.copy()
        data.pop("username", None)
        data.pop("current_date", None)

        raw_meta = data.get("recurrence_metadata")
        if raw_meta:
            try:
                parsed = json.loads(raw_meta)
                data["recurrence_metadata"] = json.dumps(parsed)
            except Exception:
                data["recurrence_metadata"] = "{}"

        uploaded_file = request.FILES.get("file")
        if uploaded_file:
            file_error = _validate_file(uploaded_file)
            if file_error:
                return Response({"file": [file_error]}, status=400)

        if letter.status == "draft":
            data["status"] = "pending"

        serializer = LetterSerializer(letter, data=data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            Log.objects.create(
                letter=updated, action="updated",
                message=(
                    f"Letter {updated.ref_no} updated"
                    + (f" by {username}" if username else "")
                    + (" and re-submitted for approval." if data.get("status") == "pending" else ".")
                ),
            )
            if updated.status == "pending" and updated.assigned_head:
                Notification.objects.create(
                    user=updated.assigned_head, letter=updated,
                    title="Task Re-submitted for Approval",
                    message=f"Task {updated.ref_no} has been updated and awaits your approval.",
                )
            return Response(LetterSerializer(updated).data)

        return Response(serializer.errors, status=400)

    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_all_letters(request):
    try:
        user = _get_user_from_request(request)
        if user is None:
            return Response({"error": "Authentication required."}, status=401)
        if not user.is_superuser:
            return Response({"error": "Admin access required."}, status=403)

        letters = Letter.objects.filter(is_active=True).select_related(
            'sender', 'receiver', 'created_by', 'assigned_to', 'assigned_head'
        )
        data = []
        for letter in letters:
            cycles = letter.cycles.all().order_by("cycle_no")
            base = {
                "letter_id":        str(letter.id),
                "id":               letter.id,
                "ref_no":           letter.ref_no,
                "subject":          letter.subject,
                "sender":           letter.sender.name   if letter.sender   else "N/A",
                "receiver":         letter.receiver.name if letter.receiver else "N/A",
                "category":         letter.category,
                "priority":         letter.priority,
                "file":             letter.file.url if letter.file else None,
                "created_by":       letter.created_by.username    if letter.created_by    else "N/A",
                "assigned_to":      letter.assigned_to.username   if letter.assigned_to   else None,
                "assigned_head":    letter.assigned_head.username if letter.assigned_head else None,
                "recurrence_type":  letter.recurrence_type,
                "recurrence_value": letter.recurrence_value,
                "created_at":       letter.created_at.isoformat(),
            }
            if cycles.exists():
                for cycle in cycles:
                    data.append({
                        **base,
                        "_id":           str(cycle.id),
                        "cycle_no":      cycle.cycle_no,
                        "due_date":      cycle.due_date.isoformat(),
                        "next_due_date": cycle.next_due_date.isoformat() if cycle.next_due_date else None,
                        "status":        cycle.status,
                    })
            else:
                data.append({
                    **base,
                    "_id":           str(letter.id),
                    "cycle_no":      1,
                    "due_date":      letter.due_date.isoformat() if letter.due_date else None,
                    "next_due_date": letter.next_due_date.isoformat() if letter.next_due_date else None,
                    "status":        letter.status,
                })

        return Response(data)

    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)

@api_view(["DELETE"])
def delete_letter(request, pk):
    user = _get_user_from_request(request)
    if user is None:
        return Response({"error": "Authentication required."}, status=401)

    letter = Letter.objects.filter(pk=pk).first()

    if not letter:
        return Response({"error": "Letter not found."}, status=404)

    if not letter.is_active:
        return Response(
            {"message": "Task already deleted."},
            status=200
        )

    is_owner = (letter.created_by == user or letter.assigned_to == user)

    if not user.is_superuser and not is_owner:
        return Response({"error": "Permission denied."}, status=403)

    letter.is_active = False
    letter.save()

    Log.objects.create(
        letter=letter,
        action="deleted",
        message=f"{user.username} deleted letter {letter.ref_no}",
    )

    return Response({"message": "Deleted successfully."}, status=200)

@api_view(["GET"])
def download_letter_file(request, pk):
    try:
        letter = get_object_or_404(Letter, pk=pk)
        if not letter.file:
            return Response({"error": "File not found"}, status=404)
        return FileResponse(
            letter.file.open(),
            as_attachment=True,
            filename=os.path.basename(letter.file.name),
        )
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def category_list(request):
    return Response(CategorySerializer(Category.objects.all(), many=True).data)


@api_view(["PATCH"])
def update_cycle_status(request, pk):
    try:
        payload  = _decode_token_payload(request)
        username = payload.get("username")

        cycle  = get_object_or_404(LetterCycle, pk=pk)
        letter = cycle.letter

        new_status = request.data.get("status")
        if new_status not in ["in-progress", "completed", "overdue"]:
            return Response({"error": "Invalid status."}, status=400)
        if cycle.status == "completed":
            return Response({"error": "Cycle already completed."}, status=400)

        old_status   = cycle.status
        cycle.status = new_status
        if new_status == "completed":
            cycle.completed_at = timezone.now()
        cycle.save()

        log_message = f"Cycle {cycle.cycle_no} status changed '{old_status}' → '{new_status}'"
        if username:
            log_message += f" by {username}"

        Log.objects.create(
            letter=letter, action="status_change",
            old_status=old_status, new_status=new_status, message=log_message,
        )

        new_cycle_created = False
        new_cycle_no      = None

        if new_status == "completed" and letter.recurrence_type:
            base = cycle.next_due_date   

            if base:
                next_cycle_no = cycle.cycle_no + 1
                next_next_due = letter.calculate_next_due_date(base)

                new_cycle = LetterCycle.objects.create(
                    letter=letter, cycle_no=next_cycle_no,
                    due_date=base, next_due_date=next_next_due, status="in-progress",
                )

                Log.objects.create(
                    letter=letter, action="recurred",
                    old_due_date=cycle.due_date, new_due_date=new_cycle.due_date,
                    next_due_date=new_cycle.next_due_date,
                    message=f"Cycle {next_cycle_no} auto-created (recurrence).",
                )

                for u in User.objects.all():
                    Notification.objects.create(
                        user=u, letter=letter,
                        title="New Cycle Created",
                        message=f"Letter {letter.ref_no} Cycle {next_cycle_no} created. Due: {base}",
                    )

                new_cycle_created = True
                new_cycle_no      = next_cycle_no

        response_data = {"success": True, "message": f"Status updated to {new_status}."}
        if new_cycle_created:
            response_data.update(
                new_cycle_created=True, new_cycle_no=new_cycle_no,
                message=f"Cycle {cycle.cycle_no} completed. New Cycle {new_cycle_no} created automatically!",
            )

        return Response(response_data, status=200)

    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_letter_history(request, pk):
    try:
        letter = get_object_or_404(Letter, pk=pk)
        logs   = Log.objects.filter(letter=letter).order_by("-created_at")
        data = [
            {
                "id":            log.id,
                "action":        log.action,
                "message":       log.message,
                "old_status":    log.old_status,
                "new_status":    log.new_status,
                "old_due_date":  log.old_due_date.isoformat()  if log.old_due_date  else None,
                "new_due_date":  log.new_due_date.isoformat()  if log.new_due_date  else None,
                "next_due_date": log.next_due_date.isoformat() if log.next_due_date else None,
                "created_at":    log.created_at.isoformat(),
            }
            for log in logs
        ]
        return Response(data, status=200)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_notifications(request):
    try:
        user = _user_from_payload(request)
        if not user:
            return Response([])
        notifs = Notification.objects.filter(user=user).order_by("-created_at")[:20]
        return Response(NotificationSerializer(notifs, many=True).data)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_unread_count(request):
    try:
        user = _user_from_payload(request)
        if not user:
            return Response({"count": 0})
        count = Notification.objects.filter(user=user, is_read=False).count()
        return Response({"count": count})
    except Exception:
        return Response({"count": 0})


@api_view(["POST"])
def mark_notification_read(request, pk):
    try:
        user = _user_from_payload(request)
        if not user:
            return Response({"error": "Authentication required."}, status=401)
        notification = get_object_or_404(Notification, pk=pk, user=user)
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def mark_all_notifications_read(request):
    try:
        user = _user_from_payload(request)
        if not user:
            return Response({"error": "Authentication required."}, status=401)
        updated = Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        return Response({"message": f"{updated} notifications marked as read.", "count": updated})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_auth_users(request):
    try:
        users = (
            User.objects
            .filter(is_active=True)
            .order_by("is_superuser", "username")
            .values("id", "username", "is_superuser", "first_name", "last_name")
        )
        return Response(list(users))
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)