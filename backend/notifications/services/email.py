import requests
from django.conf import settings

class EmailService:
    """
    Email provider service using Resend.
    Falls back cleanly to labelled Mock/Sandbox mode when RESEND_API_KEY is not configured.
    """

    @classmethod
    def is_configured(cls) -> bool:
        return bool(getattr(settings, "RESEND_API_KEY", "").strip())

    @classmethod
    def send(cls, recipient: str, subject: str, body: str, metadata: dict = None) -> dict:
        """
        Sends an email via Resend API or logs a mock delivery.
        """
        api_key = getattr(settings, "RESEND_API_KEY", "").strip()
        from_email = getattr(settings, "RESEND_FROM_EMAIL", "onboarding@resend.dev").strip() or "onboarding@resend.dev"
        test_recipient = getattr(settings, "RESEND_TEST_RECIPIENT", "").strip() or "ayush.kansal321@gmail.com"
        target_recipient = (recipient or "").strip()
        if not target_recipient or target_recipient.endswith("@example.com") or target_recipient.endswith("@notification.system"):
            target_recipient = test_recipient

        if not cls.is_configured():
            return {
                "status": "mock_delivered",
                "details": {
                    "mode": "Sandbox / Mock Delivery",
                    "provider": "Resend Email",
                    "message": "Real Resend credentials (RESEND_API_KEY) not configured in environment.",
                    "target_recipient": target_recipient,
                    "subject": subject,
                    "rendered_body": body,
                    "mock": True
                }
            }

        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": from_email,
            "to": [target_recipient],
            "subject": subject or "Notification",
            "html": f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #1e293b; margin-bottom: 16px;">{subject}</h2>
                <div style="color: #475569; line-height: 1.6; font-size: 15px;">
                    {body.replace(chr(10), '<br>')}
                </div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                <p style="color: #94a3b8; font-size: 12px;">Notification Management System &bull; Resend Delivery</p>
            </div>
            """,
            "text": body,
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            data = response.json() if response.content else {}
            if response.status_code in (200, 201):
                return {
                    "status": "sent",
                    "details": {
                        "provider": "Resend",
                        "status_code": response.status_code,
                        "resend_id": data.get("id"),
                        "mock": False
                    }
                }
            else:
                return {
                    "status": "failed",
                    "details": {
                        "provider": "Resend",
                        "status_code": response.status_code,
                        "error": data.get("message", "Resend API error"),
                        "raw_response": data,
                        "mock": False
                    }
                }
        except Exception as exc:
            return {
                "status": "failed",
                "details": {
                    "provider": "Resend",
                    "error": str(exc),
                    "mock": False
                }
            }
