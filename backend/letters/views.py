from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from django.utils import timezone
import json, os,jwt
from django.contrib.auth.models import User  

from .models import Letter, LetterCycle, Log, Notification, Category
from .serializers import (
    LetterSerializer,
    LetterCycleSerializer,
    LogSerializer,
    NotificationSerializer,
    CategorySerializer,
)

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def create_letter(request):
    try:
        data = request.data.copy()
        username = data.pop("username", None)
        
        if isinstance(username, list) and len(username) > 0:
            username = username[0]
        
        data.pop("current_date", None)

        if not data.get("status") or data.get("status") == "":
            data["status"] = "draft"
        
        print(f"📝 Letter status: {data.get('status')}")

        raw_meta = data.get("recurrence_metadata")
        if raw_meta:
            try:
                data["recurrence_metadata"] = json.loads(raw_meta)
            except:
                data["recurrence_metadata"] = {}
        else:
            data["recurrence_metadata"] = {}

        serializer = LetterSerializer(data=data)

        if serializer.is_valid():
            created_by = None
            
            if username:
                try:
                    created_by = User.objects.get(username=username)
                except User.DoesNotExist:
                    print(f" User not found with username: '{username}'")
            
            if not created_by:
                created_by = User.objects.first()
                if not created_by:
                    return Response(
                        {"error": "No users found in database. Please create a user first."},
                        status=400
                    )
            
            letter = serializer.save(created_by=created_by)
                        
            if letter.status != "draft":
                try:
                    letter.next_due_date = letter.calculate_next_due_date()
                    letter.save(update_fields=["next_due_date"])
                except Exception as e:
                    print("Next due date error:", e)

                if letter.due_date:
                    LetterCycle.objects.create(
                        letter=letter,
                        cycle_no=1,
                        due_date=letter.due_date,
                        next_due_date=letter.next_due_date,
                        status="in-progress",
                    )

                    Log.objects.create(
                        letter=letter,
                        action="created",
                        message=f"Initial cycle created for {letter.ref_no}",
                        new_due_date=letter.due_date,
                        next_due_date=letter.next_due_date,
                    )
            else:
                Log.objects.create(
                    letter=letter,
                    action="created",
                    message=f"Letter {letter.ref_no} created as draft",
                )

            return Response(LetterSerializer(letter).data, status=201)

        else:
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=400)
            
    except Exception as e:
        print("ERROR in create_letter:", str(e))
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e), "detail": "Internal server error"},
            status=500
        )

@api_view(["PUT", "PATCH"])
@parser_classes([MultiPartParser, FormParser])
def update_letter(request, pk):
    letter = get_object_or_404(Letter, pk=pk)

    serializer = LetterSerializer(letter, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=400)

@api_view(["GET"])
def list_letters(request):
   
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        
        username = None
        is_superuser = False
        
        if token:
            try:
                payload = jwt.decode(
                    token, 
                    settings.SECRET_KEY, 
                    algorithms=['HS256'],
                    options={"verify_signature": False}
                )
                username = payload.get('username')
                is_superuser = payload.get('is_superuser', False)
            except Exception as e:
                print(f" Token error: {e}")
        
        if is_superuser:
            letters = Letter.objects.select_related("sender", "receiver", "created_by").prefetch_related("cycles")
        elif username:
            try:
                user = User.objects.get(username=username)
                letters = Letter.objects.filter(created_by=user).select_related("sender", "receiver", "created_by").prefetch_related("cycles")
            except User.DoesNotExist:
                letters = Letter.objects.none()
        else:
            letters = Letter.objects.none()
        
        data = []
        
        for letter in letters:
            cycles = letter.cycles.all().order_by("cycle_no")
            
            if cycles.exists():
                for cycle in cycles:
                    data.append({
                        "_id": str(cycle.id),
                        "letter_id": str(letter.id),
                        "id": letter.id,
                        "ref_no": letter.ref_no,
                        "cycle_no": cycle.cycle_no,
                        "subject": letter.subject,
                        "sender": letter.sender.name if letter.sender else "N/A",
                        "receiver": letter.receiver.name if letter.receiver else "N/A",
                        "category": letter.category,
                        "priority": letter.priority,
                        "due_date": cycle.due_date.isoformat(),
                        "next_due_date": cycle.next_due_date.isoformat() if cycle.next_due_date else None,
                        "status": cycle.status.replace(" ", "-").lower(),
                        "file": letter.file.url if letter.file else None,  
                        "created_by": letter.created_by.username if letter.created_by else "N/A", 
                        "recurrence_type": letter.recurrence_type if letter.recurrence_type else None,
                        "recurrence_value": letter.recurrence_value if letter.recurrence_value else None, 

                    })
            else:
                data.append({
                    "_id": str(letter.id),
                    "letter_id": str(letter.id),
                    "id": letter.id,
                    "ref_no": letter.ref_no,
                    "cycle_no": 1,
                    "subject": letter.subject,
                    "sender": letter.sender.name if letter.sender else "N/A",
                    "receiver": letter.receiver.name if letter.receiver else "N/A",
                    "category": letter.category,
                    "priority": letter.priority,
                    "due_date": letter.due_date.isoformat() if letter.due_date else None,
                    "next_due_date": letter.next_due_date.isoformat() if letter.next_due_date else None,
                    "status": letter.status.replace(" ", "-").lower(),
                    "file": letter.file.url if letter.file else None,  
                    "created_by": letter.created_by.username if letter.created_by else "N/A",  
                    "recurrence_type": letter.recurrence_type if letter.recurrence_type else None,
                    "recurrence_value": letter.recurrence_value if letter.recurrence_value else None,

                })
        
        return Response(data)
        
    except Exception as e:
        print(f" ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def get_letter(request, pk):
    letter = get_object_or_404(Letter, pk=pk)
    return Response(LetterSerializer(letter).data)

@api_view(["DELETE"])
def delete_letter(request, pk):
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        
        username = None
        if token:
            try:
                payload = jwt.decode(
                    token, 
                    settings.SECRET_KEY, 
                    algorithms=['HS256'],
                    options={"verify_signature": False}
                )
                username = payload.get('username')
            except Exception as e:
                print(f"⚠️ Token error: {e}")
        
        letter = get_object_or_404(Letter, pk=pk)
      
        letter.delete()
        
        return Response({"message": "Letter deleted successfully"}, status=200)
        
    except Exception as e:
        print(f" ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


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
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)

@api_view(["PATCH"])
def update_cycle_status(request, pk):
    
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        
        username = None
        if token:
            try:
                payload = jwt.decode(
                    token, 
                    settings.SECRET_KEY, 
                    algorithms=['HS256'],
                    options={"verify_signature": False}
                )
                username = payload.get('username')
                print(f" User: {username}")
            except Exception as e:
                print(f" Token error: {e}")
        
        cycle = get_object_or_404(LetterCycle, pk=pk)
        letter = cycle.letter
        
        new_status = request.data.get("status")
        
        if new_status not in ["in-progress", "completed", "overdue"]:
            return Response({"error": "Invalid status"}, status=400)
        
        if cycle.status == "completed":
            return Response({"error": "Cycle already completed"}, status=400)
        
        old_status = cycle.status
        cycle.status = new_status
        
        if new_status == "completed":
            cycle.completed_at = timezone.now()
        
        cycle.save()
        
        log_message = f"Cycle {cycle.cycle_no} status changed from '{old_status}' to '{new_status}'"
        if username:
            log_message += f" by {username}"
        
        Log.objects.create(
            letter=letter,
            action="status_change",
            old_status=old_status,
            new_status=new_status,
            message=log_message,
        )
                
        new_cycle_created = False
        new_cycle_no = None
        
        if new_status == "completed" and cycle.next_due_date and letter.recurrence_type:
            next_cycle_no = cycle.cycle_no + 1
            next_due = cycle.next_due_date
            next_next_due = letter.calculate_next_due_date(next_due)
            
            new_cycle = LetterCycle.objects.create(
                letter=letter,
                cycle_no=next_cycle_no,
                due_date=next_due,
                next_due_date=next_next_due,
                status="in-progress"
            )
            
            Log.objects.create(
                letter=letter,
                action="recurred",
                old_due_date=cycle.due_date,
                new_due_date=new_cycle.due_date,
                next_due_date=new_cycle.next_due_date,
                message=f"Cycle {next_cycle_no} auto-created due to recurrence"
            )
            
            users = User.objects.all()
            for user in users:
                Notification.objects.create(
                    user=user,
                    letter=letter,
                    title="New Cycle Created",
                    message=f"Letter {letter.ref_no} Cycle {next_cycle_no} created. Due: {next_due}"
                )
            
            new_cycle_created = True
            new_cycle_no = next_cycle_no
            
        
        response_data = {
            "success": True,
            "message": f"Status updated to {new_status}"
        }
        
        if new_cycle_created:
            response_data["new_cycle_created"] = True
            response_data["new_cycle_no"] = new_cycle_no
            response_data["message"] = f"Cycle {cycle.cycle_no} completed. New Cycle {new_cycle_no} created automatically!"
        
        return Response(response_data, status=200)
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_letter_history(request, pk):
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        
        username = None
        if token:
            try:
                payload = jwt.decode(
                    token, 
                    settings.SECRET_KEY, 
                    algorithms=['HS256'],
                    options={"verify_signature": False}
                )
                username = payload.get('username')
            except Exception as e:
                print(f"Token error: {e}")
        
        try:
            letter = Letter.objects.get(pk=pk)
        except Letter.DoesNotExist:
            return Response({"error": "Letter not found"}, status=404)
        
        logs = Log.objects.filter(letter=letter).order_by("-created_at")
        
        data = []
        for log in logs:
            data.append({
                "id": log.id,
                "action": log.action,
                "message": log.message,
                "old_status": log.old_status,
                "new_status": log.new_status,
                "old_due_date": log.old_due_date.isoformat() if log.old_due_date else None,
                "new_due_date": log.new_due_date.isoformat() if log.new_due_date else None,
                "next_due_date": log.next_due_date.isoformat() if log.next_due_date else None,
                "created_at": log.created_at.isoformat(),
            })
        
        return Response(data, status=200)

    except Exception as e:
        print(f" ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def get_notifications(request):
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
                
        if not token:
            return Response([])
        
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=['HS256'],
                options={"verify_signature": False}
            )
            username = payload.get('username')
            
            if username:
                user = User.objects.get(username=username)
                
                notifications = Notification.objects.filter(user=user).order_by("-created_at")[:20]
                
                serialized = NotificationSerializer(notifications, many=True).data
                
                return Response(serialized)
        except User.DoesNotExist:
            return Response([])
        except Exception as e:
            return Response([])
        
        return Response([])
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_unread_count(request):
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        
        
        if not token:
            return Response({"count": 0})
        
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=['HS256'],
                options={"verify_signature": False}
            )
            username = payload.get('username')
            
            if username:
                user = User.objects.get(username=username)
                count = Notification.objects.filter(user=user, is_read=False).count()
                return Response({"count": count})
        except User.DoesNotExist:
            return Response({"count": 0})
        except Exception as e:
            return Response({"count": 0})
        
        return Response({"count": 0})
        
    except Exception as e:
        print(f"ERROR in get_unread_count: {str(e)}")
        return Response({"count": 0})


@api_view(["POST"])
def mark_notification_read(request, pk):
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        
        if not token:
            return Response({"error": "No authentication token"}, status=401)
        
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=['HS256'],
                options={"verify_signature": False}
            )
            username = payload.get('username')
            
            if username:
                user = User.objects.get(username=username)
                notification = get_object_or_404(Notification, pk=pk, user=user)
                notification.is_read = True
                notification.save()
                
                return Response(NotificationSerializer(notification).data)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
            
        return Response({"error": "Authentication failed"}, status=401)
        
    except Exception as e:
        print(f" ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def mark_all_notifications_read(request):
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        
        if not token:
            return Response({"error": "No authentication token"}, status=401)
        
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=['HS256'],
                options={"verify_signature": False}
            )
            username = payload.get('username')
            
            if username:
                user = User.objects.get(username=username)
                updated = Notification.objects.filter(user=user, is_read=False).update(is_read=True)
                
                return Response({"message": f"{updated} notifications marked as read", "count": updated})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        return Response({"error": "Authentication failed"}, status=401)
        
    except Exception as e:
        print(f" ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)