from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from .models import Department
import json

class DepartmentView:

    @require_GET
    def list_departments(request):
        departments = Department.objects.all().order_by("name")
        data = [{"id": d.id, "name": d.name, "description": d.description} for d in departments]
        return JsonResponse(data, safe=False)

    @csrf_exempt
    @require_POST
    def create_department(request):
        try:
            data = json.loads(request.body.decode("utf-8"))
            name = data.get("name")
            description = data.get("description", "")

            if not name:
                return JsonResponse({"success": False, "error": "Name is required"}, status=400)

            dept = Department.objects.create(name=name, description=description)
            return JsonResponse({"success": True, "id": dept.id, "name": dept.name, "description": dept.description}, status=201)

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    @require_GET
    def get_department(request, dept_id):
        try:
            dept = Department.objects.get(pk=dept_id)
            return JsonResponse({"id": dept.id, "name": dept.name, "description": dept.description})
        except Department.DoesNotExist:
            return JsonResponse({"success": False, "error": "Department not found"}, status=404)

    @csrf_exempt
    @require_POST
    def update_department(request, dept_id):
        try:
            dept = Department.objects.get(pk=dept_id)
            data = json.loads(request.body.decode("utf-8"))
            name = data.get("name", dept.name)
            description = data.get("description", dept.description)
            dept.name = name
            dept.description = description
            dept.save()
            return JsonResponse({"success": True, "id": dept.id, "name": dept.name, "description": dept.description})
        except Department.DoesNotExist:
            return JsonResponse({"success": False, "error": "Department not found"}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    @csrf_exempt
    @require_POST
    def delete_department(request, dept_id):
        try:
            dept = Department.objects.get(pk=dept_id)
            dept.delete()
            return JsonResponse({"success": True, "message": "Department deleted"})
        except Department.DoesNotExist:
            return JsonResponse({"success": False, "error": "Department not found"}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
