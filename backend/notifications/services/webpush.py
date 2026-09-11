import requests
from django.conf import settings

class WebPushService:
    """
    Web Push provider service using OneSignal REST API.
    Falls back cleanly to labelled Mock/Sandbox mode when credentials are not configured.
    """

    @classmethod
    def is_configured(cls) -> bool:
        return bool(
            getattr(settings, "ONESIGNAL_APP_ID", "").strip()
            and getattr(settings, "ONESIGNAL_REST_API_KEY", "").strip()
        )

    @classmethod
    def send(
        cls,
        recipient: str,
        title: str,
        body: str,
        subscription_data: dict = None,
        metadata: dict = None
    ) -> dict:
        """
        Sends a Web Push notification via OneSignal or logs a mock delivery.
        """
        app_id = getattr(settings, "ONESIGNAL_APP_ID", "").strip()
        api_key = getattr(settings, "ONESIGNAL_REST_API_KEY", "").strip()
        target_recipient = recipient or "Browser Subscriber"

        if not cls.is_configured():
            return {
                "status": "mock_delivered",
                "details": {
                    "mode": "Sandbox / Mock Delivery",
                    "provider": "OneSignal Web Push",
                    "message": "Real OneSignal credentials (ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY) not configured in environment.",
                    "target_recipient": target_recipient,
                    "title": title,
                    "rendered_body": body,
                    "mock": True
                }
            }

        url = "https://onesignal.com/api/v1/notifications"
        headers = {
            "Authorization": f"Basic {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "app_id": app_id,
            "headings": {"en": title or "Notification"},
            "contents": {"en": body},
        }

        # If we have specific player_id or subscription_id, target specifically
        player_id = None
        if subscription_data and isinstance(subscription_data, dict):
            player_id = subscription_data.get("player_id") or subscription_data.get("id")

        if player_id:
            payload["include_subscription_ids"] = [str(player_id)]
        else:
            payload["included_segments"] = ["Total Subscriptions"]

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            data = response.json() if response.content else {}
            if response.status_code in (200, 201) and not data.get("errors"):
                return {
                    "status": "sent",
                    "details": {
                        "provider": "OneSignal",
                        "status_code": response.status_code,
                        "notification_id": data.get("id"),
                        "recipients_count": data.get("recipients", 0),
                        "mock": False
                    }
                }
            else:
                return {
                    "status": "failed",
                    "details": {
                        "provider": "OneSignal",
                        "status_code": response.status_code,
                        "errors": data.get("errors", "OneSignal dispatch failed"),
                        "raw_response": data,
                        "mock": False
                    }
                }
        except Exception as exc:
            return {
                "status": "failed",
                "details": {
                    "provider": "OneSignal",
                    "error": str(exc),
                    "mock": False
                }
            }
