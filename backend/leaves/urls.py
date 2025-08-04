from django.urls import path
from .views import get_leave_requests, create_leave_request,handle_leave_request

urlpatterns = [
    path("get/<int:erpid>/", get_leave_requests, name="get_leave_requests"),
    path("apply/", create_leave_request, name="create_leave_request"),
    path("approve/", handle_leave_request, name="handle_leave_request"),
]