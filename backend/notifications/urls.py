from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    NotificationMatrixView,
    TriggerViewSet,
    ChannelTemplateViewSet,
    NotificationLogListView,
    PushSubscribeView,
)

router = DefaultRouter()
router.register(r"triggers", TriggerViewSet, basename="trigger")
router.register(r"templates", ChannelTemplateViewSet, basename="template")

urlpatterns = [
    # Authentication endpoints
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),

    # Notification Admin Matrix
    path("notification-matrix/", NotificationMatrixView.as_view(), name="notification-matrix"),

    # Direct manual trigger fire endpoint: /api/triggers/<trigger_key>/fire/
    path("triggers/<str:trigger_key>/fire/", TriggerViewSet.as_view({"post": "fire"}), name="trigger-fire"),

    # Notification Logs
    path("notification-logs/", NotificationLogListView.as_view(), name="notification-logs"),

    # Web Push Subscription
    path("push/subscribe/", PushSubscribeView.as_view(), name="push-subscribe"),

    # Routers (Triggers & Templates CRUD, toggle, test)
    path("", include(router.urls)),
]
