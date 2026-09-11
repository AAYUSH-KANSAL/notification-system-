from django.db import models
from django.conf import settings

class Trigger(models.Model):
    """
    Events that trigger automated notifications (e.g., 'login', 'logout').
    """
    key = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique programmatic identifier (e.g. login, logout)"
    )
    name = models.CharField(
        max_length=100,
        help_text="Human-readable trigger name (e.g. User Login)"
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Description of when this trigger fires"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this trigger is active and fires notifications"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Trigger"
        verbose_name_plural = "Triggers"

    def __str__(self):
        return f"{self.name} ({self.key})"


class ChannelTemplate(models.Model):
    """
    Notification template configured for a specific trigger and delivery channel.
    """
    CHANNEL_CHOICES = [
        ("whatsapp", "WhatsApp"),
        ("email", "Email"),
        ("webpush", "Web Push"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("synced", "Synced"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    trigger = models.ForeignKey(
        Trigger,
        on_delete=models.CASCADE,
        related_name="templates",
        help_text="Associated trigger event"
    )
    channel = models.CharField(
        max_length=20,
        choices=CHANNEL_CHOICES,
        help_text="Delivery channel"
    )
    is_enabled = models.BooleanField(
        default=True,
        help_text="Whether notifications for this channel are enabled"
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Heading or title (primarily for Web Push)"
    )
    subject = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Subject line (primarily for Email)"
    )
    body = models.TextField(
        help_text="Template body supporting {{variable}} placeholders"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft",
        help_text="Template sync or review status (used for WhatsApp Meta Cloud approval)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["trigger", "channel"]
        constraints = [
            models.UniqueConstraint(
                fields=["trigger", "channel"],
                name="unique_trigger_channel"
            )
        ]
        verbose_name = "Channel Template"
        verbose_name_plural = "Channel Templates"

    def __str__(self):
        return f"{self.trigger.name} - {self.get_channel_display()} ({'ON' if self.is_enabled else 'OFF'})"


class WebPushSubscription(models.Model):
    """
    Browser push subscription info for Web Push delivery (OneSignal).
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="push_subscriptions",
        help_text="Associated authenticated user"
    )
    subscription_data = models.JSONField(
        default=dict,
        help_text="OneSignal player_id or browser push subscription dictionary"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this subscription is currently valid"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Web Push Subscription"
        verbose_name_plural = "Web Push Subscriptions"

    def __str__(self):
        username = self.user.username if self.user else "Anonymous"
        return f"Push Subscription #{self.id} for {username}"


class NotificationLog(models.Model):
    """
    Audit log of all sent, mock-delivered, skipped, or failed notifications.
    """
    STATUS_CHOICES = [
        ("sent", "Sent"),
        ("mock_delivered", "Mock Delivered"),
        ("failed", "Failed"),
        ("skipped", "Skipped"),
    ]

    trigger_key = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Trigger key that initiated notification"
    )
    channel = models.CharField(
        max_length=20,
        db_index=True,
        help_text="Channel (whatsapp, email, webpush)"
    )
    recipient = models.CharField(
        max_length=255,
        help_text="Recipient phone number, email address, or device identifier"
    )
    payload = models.JSONField(
        default=dict,
        help_text="Rendered content and metadata sent to provider"
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="sent",
        db_index=True
    )
    response_details = models.JSONField(
        default=dict,
        help_text="Provider API response, error message, or mock reason"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Notification Log"
        verbose_name_plural = "Notification Logs"

    def __str__(self):
        return f"[{self.status.upper()}] {self.trigger_key} via {self.channel} -> {self.recipient}"
