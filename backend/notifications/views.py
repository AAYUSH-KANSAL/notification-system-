from django.contrib.auth import authenticate, get_user_model
from rest_framework import status, viewsets, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Trigger, ChannelTemplate, WebPushSubscription, NotificationLog
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    TriggerSerializer,
    ChannelTemplateSerializer,
    NotificationLogSerializer,
    WebPushSubscriptionSerializer,
)
from .permissions import IsAdminRoleUser
from .services.notification_service import NotificationService

User = get_user_model()


class RegisterView(APIView):
    """
    User registration endpoint.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "user": UserSerializer(user).data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    User login endpoint. Authenticates credentials and fires the LOGIN trigger.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username_or_email = request.data.get("username") or request.data.get("email", "").strip()
        password = request.data.get("password", "")

        if not username_or_email or not password:
            return Response(
                {"detail": "Both username/email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Allow login via username or email
        user = authenticate(request, username=username_or_email, password=password)
        if not user:
            try:
                user_obj = User.objects.get(email=username_or_email)
                user = authenticate(request, username=user_obj.username, password=password)
            except (User.DoesNotExist, User.MultipleObjectsReturned):
                pass

        if not user:
            return Response(
                {"detail": "Invalid credentials. Please check your username/email and password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)

        # FIRE THE REAL LOGIN TRIGGER
        trigger_result = NotificationService.dispatch_trigger(
            trigger_key="login",
            user=user,
            context={"action": "User Logged In"},
        )

        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "trigger_dispatched": trigger_result,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    User logout endpoint. Authenticates user session and fires the LOGOUT trigger.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        # FIRE THE REAL LOGOUT TRIGGER
        trigger_result = NotificationService.dispatch_trigger(
            trigger_key="logout",
            user=user,
            context={"action": "User Logged Out"},
        )

        # Optional token blacklist if provided
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass

        return Response(
            {
                "detail": "Logged out successfully.",
                "trigger_dispatched": trigger_result,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """
    Returns current authenticated user details.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class NotificationMatrixView(APIView):
    """
    Returns the core single-screen matrix of triggers and channels for the admin interface.
    """
    permission_classes = [IsAdminRoleUser]

    def get(self, request):
        triggers = Trigger.objects.prefetch_related("templates").all()
        matrix = []

        for trigger in triggers:
            templates_by_channel = {
                template.channel: ChannelTemplateSerializer(template).data
                for template in trigger.templates.all()
            }
            matrix.append(
                {
                    "id": trigger.id,
                    "key": trigger.key,
                    "name": trigger.name,
                    "description": trigger.description,
                    "is_active": trigger.is_active,
                    "channels": {
                        "whatsapp": templates_by_channel.get("whatsapp"),
                        "email": templates_by_channel.get("email"),
                        "webpush": templates_by_channel.get("webpush"),
                    },
                }
            )

        providers = NotificationService.get_providers_status()
        return Response({"triggers": matrix, "providers": providers})


class TriggerViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Triggers. Admin role required.
    """
    queryset = Trigger.objects.all()
    serializer_class = TriggerSerializer
    permission_classes = [IsAdminRoleUser]

    @action(detail=False, methods=["post"], url_path="fire/(?P<trigger_key>[^/.]+)")
    def fire(self, request, trigger_key=None):
        """
        Manually fires a trigger with custom payload for developer convenience.
        """
        context = request.data.get("context", {})
        result = NotificationService.dispatch_trigger(
            trigger_key=trigger_key,
            user=request.user,
            context=context,
        )
        return Response(result)


class ChannelTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Channel Templates. Admin role required.
    """
    queryset = ChannelTemplate.objects.select_related("trigger").all()
    serializer_class = ChannelTemplateSerializer
    permission_classes = [IsAdminRoleUser]

    @action(detail=True, methods=["patch"], url_path="toggle")
    def toggle(self, request, pk=None):
        """
        Toggles the is_enabled status of a channel template.
        """
        template = self.get_object()
        template.is_enabled = not template.is_enabled
        template.save(update_fields=["is_enabled", "updated_at"])
        return Response(ChannelTemplateSerializer(template).data)

    @action(detail=True, methods=["post"], url_path="test")
    def test(self, request, pk=None):
        """
        Sends a test notification for this template.
        """
        template = self.get_object()
        context = request.data.get("context", {})
        result = NotificationService.test_send_template(template, test_context=context, user=request.user)
        return Response({
            "template_id": template.id,
            "channel": template.channel,
            "result": result,
        })

    @action(detail=True, methods=["post"], url_path="sync-whatsapp")
    def sync_whatsapp(self, request, pk=None):
        """
        Simulates / executes WhatsApp template status lifecycle (Draft -> Synced -> Approved).
        """
        template = self.get_object()
        if template.channel != "whatsapp":
            return Response(
                {"detail": "Sync status is only applicable to WhatsApp templates."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        status_cycle = {
            "draft": "synced",
            "synced": "approved",
            "approved": "draft",
            "rejected": "draft",
        }
        next_status = status_cycle.get(template.status, "approved")
        template.status = next_status
        template.save(update_fields=["status", "updated_at"])
        return Response({
            "template_id": template.id,
            "status": template.status,
            "detail": f"WhatsApp template status updated to {template.status.title()} (Meta Cloud Sandbox Lifecycle)",
        })


class NotificationLogListView(generics.ListAPIView):
    """
    List view for notification logs with filtering by trigger, channel, or status.
    """
    serializer_class = NotificationLogSerializer
    permission_classes = [IsAdminRoleUser]

    def get_queryset(self):
        queryset = NotificationLog.objects.all().order_by("-created_at")
        trigger = self.request.query_params.get("trigger")
        channel = self.request.query_params.get("channel")
        log_status = self.request.query_params.get("status")

        if trigger:
            queryset = queryset.filter(trigger_key=trigger)
        if channel:
            queryset = queryset.filter(channel=channel)
        if log_status:
            queryset = queryset.filter(status=log_status)

        return queryset[:100]  # Limit to 100 most recent logs for performance


class PushSubscribeView(APIView):
    """
    Registers or updates browser push notification subscription (OneSignal) for the user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        subscription_data = request.data.get("subscription_data", {})
        if not subscription_data:
            return Response(
                {"detail": "subscription_data is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sub, _ = WebPushSubscription.objects.update_or_create(
            user=request.user,
            defaults={"subscription_data": subscription_data, "is_active": True},
        )
        return Response(WebPushSubscriptionSerializer(sub).data, status=status.HTTP_200_OK)
