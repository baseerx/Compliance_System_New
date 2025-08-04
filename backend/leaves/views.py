from django.shortcuts import render
from django.http import JsonResponse
from .models import LeaveModel
from django.views.decorators.http import require_GET,require_POST
from django.views.decorators.csrf import csrf_exempt
import json
from sqlalchemy import text
from db import SessionLocal
# Create your views here.

@require_GET
def get_leave_requests(request,erpid):
    leaves = LeaveModel.objects.all()
    data=[]
    sessions= SessionLocal()
    query = text("""
        SELECT
            l.id,
            e.name AS employee_name,
            l.employee_id,
            l.erp_id,
            l.leave_type,
            l.head_erpid,
            (SELECT name FROM employees WHERE erp_id = l.head_erpid) AS headname,
            l.start_date,
            l.end_date,
            l.reason,
            l.status,
            l.created_at
        FROM leaves l
        LEFT JOIN employees e 
            ON l.erp_id = e.erp_id
        LEFT JOIN employees h
            ON l.head_erpid = h.erp_id
        WHERE e.flag = 1
          AND e.section_id = (SELECT section_id FROM employees WHERE erp_id = :epid)
    
        ORDER BY l.created_at DESC
    """)
    result = sessions.execute(query, {"epid": erpid}).fetchall()
    
    for row in result:
        data.append({
            "id": row[0],
            "employee_name": row[1],
            "employee_id": row[2],
            "erp_id": row[3],
            "leave_type": row[4],
            "start_date": row[7].strftime('%Y-%m-%d'),
            "end_date": row[8].strftime('%Y-%m-%d'),
            "reason": row[9],
            "status": row[10],
            "created_at": row[11].strftime('%Y-%m-%d %H:%M:%S'),
            "head_erpid": '-' if row[5]==0 else row[5],
            "head_name": row[6]
        })
    sessions.close()
    return JsonResponse({"leaves": data},status=200)

@csrf_exempt
@require_POST
def create_leave_request(request):
    data = json.loads(request.body.decode('utf-8'))
    print("Received data:", data)
    leave = LeaveModel.objects.create(
        erp_id=data.get("erp_id", 0),
        employee_id=data.get("employee_id", 0),
        head_erpid=data.get("head", 0),
        leave_type=data.get("leave_type", ""),
        reason=data.get("reason", ""),
        status=data.get("status", ""),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
    )
    
    return JsonResponse({"message": "Leave request created successfully", "id": leave.pk})

@csrf_exempt
@require_POST
def handle_leave_request(request):
    data = json.loads(request.body.decode('utf-8'))
    leave_id = data.get("recordid")
    action = data.get("action")

    if action == "approve":
        LeaveModel.objects.filter(pk=leave_id).update(status="approved")
    elif action == "reject":
        LeaveModel.objects.filter(pk=leave_id).update(status="rejected")

    return JsonResponse({"message": "Leave request updated successfully"})

    
