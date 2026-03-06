from django.urls import path
from .views import DepartmentView

urlpatterns = [
    path("departments/", DepartmentView.list_departments, name="list_departments"),
    path("departments/create/", DepartmentView.create_department, name="create_department"),
    path("departments/<int:dept_id>/", DepartmentView.get_department, name="get_department"),
    path("departments/<int:dept_id>/update/", DepartmentView.update_department, name="update_department"),
    path("departments/<int:dept_id>/delete/", DepartmentView.delete_department, name="delete_department"),
]
