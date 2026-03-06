from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("create/",            views.create_letter,       name="create_letter"),
    path("",                   views.list_letters,         name="list_letters"),
    path("<int:pk>/",          views.get_letter,           name="get_letter"),
    path("<int:pk>/update/",   views.update_letter,        name="update_letter"),
    path("<int:pk>/delete/",   views.delete_letter,        name="delete_letter"),
    path("all/", views.get_all_letters, name="get_all_letters"),
    path("<int:pk>/download/", views.download_letter_file, name="download_letter_file"),

    path("<int:pk>/approve/",  views.approve_letter,       name="approve_letter"),
    path("<int:pk>/reject/",   views.reject_letter,        name="reject_letter"),
    path("cycles/<int:pk>/status/", views.update_cycle_status, name="update_cycle_status"),
    path("categories/",             views.category_list,           name="category-list"),
    path("history/<int:pk>/",       views.get_letter_history,      name="letter_history"),

    path("notifications/",                    views.get_notifications,          name="get_notifications"),
    path("notifications/unread-count/",       views.get_unread_count,           name="get_unread_count"),
    path("notifications/<int:pk>/read/",      views.mark_notification_read,     name="mark_notification_read"),
    path("notifications/read-all/",           views.mark_all_notifications_read,name="mark_all_notifications_read"),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)