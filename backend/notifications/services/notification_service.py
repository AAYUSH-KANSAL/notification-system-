import re
import logging
from django.utils import timezone
from django.conf import settings
from ..models import Trigger, ChannelTemplate, WebPushSubscription, NotificationLog
from .whatsapp import WhatsAppService
from .email import EmailService
from .webpush import WebPushService

logger = logging.getLogger(__name__)


def render_template(template_str: str, context: dict) -> str:
    """
    Interpolates {{variable_name}} tokens in a template string using the provided context dictionary.
    Handles optional whitespace like {{ user_name }}.
    """
    if not template_str:
        return ""

    def replace_var(match):
        key = match.group(1).strip()
        if key in context and context[key] is not None:
            return str(context[key])
        return match.group(0)  # Keep raw token if not provided

    return re.sub(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}", replace_var, template_str)


class NotificationService:
    """
    Central dispatcher orchestrating notification triggers, template retrieval,
    variable interpolation, channel routing, provider failure isolation, and logging.
    """

    @classmethod
    def get_providers_status(cls) -> dict:
        """
        Returns real configuration status of all 3 channels for frontend dashboard badges.
        """
        return {
            "whatsapp": {
                "provider": WhatsAppService.get_provider_name(),
                "configured": WhatsAppService.is_configured(),
                "mode": "Live" if WhatsAppService.is_configured() else "Sandbox / Mock Delivery",
            },
            "email": {
                "provider": "Resend",
                "configured": EmailService.is_configured(),
                "mode": "Live" if EmailService.is_configured() else "Sandbox / Mock Delivery",
            },
            "webpush": {
                "provider": "OneSignal",
                "configured": WebPushService.is_configured(),
                "mode": "Live" if WebPushService.is_configured() else "Sandbox / Mock Delivery",
            },
        }

    @classmethod
    def dispatch_trigger(
        cls,
        trigger_key: str,
        user=None,
        context: dict = None,
        specific_channel: str = None,
    ) -> dict:
        """
        Dispatches notifications for an active trigger across all enabled channel templates.
        Guarantees that provider failures do not crash the trigger flow.
        """
        try:
            trigger = Trigger.objects.get(key=trigger_key)
        except Trigger.DoesNotExist:
            logger.warning(f"Trigger '{trigger_key}' does not exist.")
            return {"status": "skipped", "reason": f"Trigger '{trigger_key}' not found", "results": {}}

        if not trigger.is_active:
            logger.info(f"Trigger '{trigger_key}' is inactive. Skipping notification dispatch.")
            return {"status": "skipped", "reason": f"Trigger '{trigger_key}' is inactive", "results": {}}

        # Build context dictionary
        test_email = getattr(settings, "RESEND_TEST_RECIPIENT", "").strip()
        user_name = "Guest"
        user_email = test_email or "guest@notification.system"
        if user and user.is_authenticated:
            user_name = user.get_full_name() or user.first_name or user.username
            if user.email and not user.email.endswith("@example.com"):
                user_email = user.email
            elif test_email:
                user_email = test_email
            else:
                user_email = f"{user.username}@notification.system"

        ctx = {
            "user_name": user_name,
            "user_email": user_email,
            "timestamp": timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
        }
        if context:
            ctx.update(context)
            ctx_email = ctx.get("user_email", "")
            if (not ctx_email or ctx_email.endswith("@example.com")):
                ctx["user_email"] = test_email or user_email

        # Retrieve templates for this trigger
        templates_qs = ChannelTemplate.objects.filter(trigger=trigger)
        if specific_channel:
            templates_qs = templates_qs.filter(channel=specific_channel)

        dispatched_results = {}

        for template in templates_qs:
            channel = template.channel

            # Check if channel template is enabled
            if not template.is_enabled:
                logger.info(f"Channel '{channel}' for trigger '{trigger_key}' is disabled. Skipping.")
                dispatched_results[channel] = {
                    "status": "skipped",
                    "reason": "Channel disabled by administrator"
                }
                continue

            try:
                if channel == "whatsapp":
                    res = cls._dispatch_whatsapp(trigger_key, template, user, ctx)
                elif channel == "email":
                    res = cls._dispatch_email(trigger_key, template, user, ctx)
                elif channel == "webpush":
                    res = cls._dispatch_webpush(trigger_key, template, user, ctx)
                else:
                    res = {"status": "failed", "details": {"error": f"Unknown channel '{channel}'"}}

                dispatched_results[channel] = res

            except Exception as exc:
                logger.error(f"Unexpected exception dispatching {channel} for trigger {trigger_key}: {exc}", exc_info=True)
                error_details = {"error": str(exc), "type": exc.__class__.__name__}
                NotificationLog.objects.create(
                    trigger_key=trigger_key,
                    channel=channel,
                    recipient=ctx.get("user_email") or "Unknown",
                    payload={"context": ctx},
                    status="failed",
                    response_details=error_details,
                )
                dispatched_results[channel] = {
                    "status": "failed",
                    "details": error_details
                }

        return {
            "status": "completed",
            "trigger": trigger_key,
            "results": dispatched_results,
        }

    @classmethod
    def _dispatch_whatsapp(cls, trigger_key: str, template: ChannelTemplate, user, ctx: dict) -> dict:
        rendered_body = render_template(template.body, ctx)
        fallback_phone = getattr(settings, "WHATSAPP_TEST_RECIPIENT", "").strip()
        recipient = ctx.get("phone") or getattr(user, "phone", None) or fallback_phone

        res = WhatsAppService.send(
            recipient=recipient,
            body=rendered_body,
            metadata={"trigger": trigger_key, "template_id": template.id}
        )

        NotificationLog.objects.create(
            trigger_key=trigger_key,
            channel="whatsapp",
            recipient=recipient,
            payload={
                "template_id": template.id,
                "body": rendered_body,
                "context": ctx,
            },
            status=res["status"],
            response_details=res["details"],
        )
        return res

    @classmethod
    def _dispatch_email(cls, trigger_key: str, template: ChannelTemplate, user, ctx: dict) -> dict:
        rendered_subject = render_template(template.subject or "Notification", ctx)
        rendered_body = render_template(template.body, ctx)
        recipient = ctx.get("user_email") or (user.email if user and user.email else "")
        test_email = getattr(settings, "RESEND_TEST_RECIPIENT", "").strip()
        if (not recipient or recipient.endswith("@example.com")) and test_email:
            recipient = test_email

        res = EmailService.send(
            recipient=recipient,
            subject=rendered_subject,
            body=rendered_body,
            metadata={"trigger": trigger_key, "template_id": template.id}
        )

        NotificationLog.objects.create(
            trigger_key=trigger_key,
            channel="email",
            recipient=recipient,
            payload={
                "template_id": template.id,
                "subject": rendered_subject,
                "body": rendered_body,
                "context": ctx,
            },
            status=res["status"],
            response_details=res["details"],
        )
        return res

    @classmethod
    def _dispatch_webpush(cls, trigger_key: str, template: ChannelTemplate, user, ctx: dict) -> dict:
        rendered_title = render_template(template.title or "New Notification", ctx)
        rendered_body = render_template(template.body, ctx)
        recipient = ctx.get("user_name") or (user.username if user else "Web Subscriber")

        # Check for active subscription
        sub_data = None
        if user and user.is_authenticated:
            active_sub = WebPushSubscription.objects.filter(user=user, is_active=True).first()
            if active_sub:
                sub_data = active_sub.subscription_data

        # Fallback to any active browser subscription if current user has not subscribed separately
        if not sub_data:
            any_sub = WebPushSubscription.objects.filter(is_active=True).first()
            if any_sub:
                sub_data = any_sub.subscription_data

        res = WebPushService.send(
            recipient=recipient,
            title=rendered_title,
            body=rendered_body,
            subscription_data=sub_data,
            metadata={"trigger": trigger_key, "template_id": template.id}
        )

        NotificationLog.objects.create(
            trigger_key=trigger_key,
            channel="webpush",
            recipient=recipient,
            payload={
                "template_id": template.id,
                "title": rendered_title,
                "body": rendered_body,
                "context": ctx,
            },
            status=res["status"],
            response_details=res["details"],
        )
        return res

    @classmethod
    def test_send_template(cls, template: ChannelTemplate, test_context: dict = None, user=None) -> dict:
        """
        Sends a test notification for an individual channel template.
        """
        fallback_email = getattr(settings, "RESEND_TEST_RECIPIENT", "").strip() or "delivered@resend.dev"
        ctx = {
            "user_name": getattr(user, "username", "Tester") if user else "Tester",
            "user_email": (getattr(user, "email", "") or fallback_email) if user else fallback_email,
            "timestamp": timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
        }
        if test_context:
            ctx.update(test_context)

        trigger_key = template.trigger.key
        channel = template.channel

        if channel == "whatsapp":
            res = cls._dispatch_whatsapp(f"{trigger_key}:test", template, user, ctx)
        elif channel == "email":
            res = cls._dispatch_email(f"{trigger_key}:test", template, user, ctx)
        elif channel == "webpush":
            res = cls._dispatch_webpush(f"{trigger_key}:test", template, user, ctx)
        else:
            res = {"status": "failed", "details": {"error": f"Unknown channel '{channel}'"}}

        return res
