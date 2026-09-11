import requests
from django.conf import settings

class WhatsAppService:
    """
    Service for WhatsApp delivery supporting:
    1. Twilio WhatsApp Sandbox (preferred quick setup via Account SID & Auth Token)
    2. Meta WhatsApp Cloud API Sandbox (via Graph API & Phone Number ID)
    Falls back to clearly-labelled Mock/Sandbox mode when credentials are not configured.
    """

    @classmethod
    def get_active_provider(cls) -> str:
        if bool(
            getattr(settings, "TWILIO_ACCOUNT_SID", "").strip()
            and getattr(settings, "TWILIO_AUTH_TOKEN", "").strip()
        ):
            return "twilio"
        if bool(
            getattr(settings, "WHATSAPP_ACCESS_TOKEN", "").strip()
            and getattr(settings, "PHONE_NUMBER_ID", "").strip()
        ):
            return "meta"
        return "none"

    @classmethod
    def is_configured(cls) -> bool:
        return cls.get_active_provider() != "none"

    @classmethod
    def get_provider_name(cls) -> str:
        provider = cls.get_active_provider()
        if provider == "twilio":
            return "Twilio WhatsApp Sandbox"
        if provider == "meta":
            return "Meta WhatsApp Cloud API Sandbox"
        return "Twilio / Meta Sandbox"

    @classmethod
    def send(cls, recipient: str, body: str, metadata: dict = None) -> dict:
        """
        Sends a WhatsApp message via Twilio Sandbox, Meta Cloud API, or returns a mock delivery.
        """
        fallback_recipient = getattr(settings, "WHATSAPP_TEST_RECIPIENT", "").strip()
        target_recipient = recipient or fallback_recipient or "+919876543210"

        active_provider = cls.get_active_provider()

        # Check if real credentials are provided
        if active_provider == "none":
            return {
                "status": "mock_delivered",
                "details": {
                    "mode": "Sandbox / Mock Delivery",
                    "provider": "Twilio / Meta WhatsApp Sandbox",
                    "message": "Real WhatsApp credentials (TWILIO_ACCOUNT_SID or WHATSAPP_ACCESS_TOKEN) not provided in environment.",
                    "target_recipient": target_recipient,
                    "rendered_body": body,
                    "mock": True
                }
            }

        if active_provider == "twilio":
            return cls._send_twilio(target_recipient, body)
        else:
            return cls._send_meta(target_recipient, body)

    @classmethod
    def _send_twilio(cls, target_recipient: str, body: str) -> dict:
        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "").strip()
        auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "").strip()
        from_number = getattr(settings, "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886").strip()
        if not from_number.startswith("whatsapp:"):
            from_number = f"whatsapp:{from_number}"

        # Clean recipient phone number
        cleaned = target_recipient.strip().replace(" ", "").replace("-", "")
        if not cleaned.startswith("+"):
            cleaned = f"+{cleaned}"
        to_number = f"whatsapp:{cleaned}"

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        data = {
            "From": from_number,
            "To": to_number,
            "Body": body,
        }

        try:
            response = requests.post(url, data=data, auth=(account_sid, auth_token), timeout=10)
            res_data = response.json() if response.content else {}
            if response.status_code in (200, 201):
                return {
                    "status": "sent",
                    "details": {
                        "provider": "Twilio WhatsApp Sandbox",
                        "status_code": response.status_code,
                        "message_sid": res_data.get("sid"),
                        "to": res_data.get("to"),
                        "twilio_response": res_data,
                        "mock": False
                    }
                }
            else:
                return {
                    "status": "failed",
                    "details": {
                        "provider": "Twilio WhatsApp Sandbox",
                        "status_code": response.status_code,
                        "error": res_data.get("message", "Twilio API request failed"),
                        "code": res_data.get("code"),
                        "more_info": res_data.get("more_info"),
                        "raw_response": res_data,
                        "mock": False
                    }
                }
        except Exception as exc:
            return {
                "status": "failed",
                "details": {
                    "provider": "Twilio WhatsApp Sandbox",
                    "error": str(exc),
                    "mock": False
                }
            }

    @classmethod
    def _send_meta(cls, target_recipient: str, body: str) -> dict:
        access_token = getattr(settings, "WHATSAPP_ACCESS_TOKEN", "").strip()
        phone_number_id = getattr(settings, "PHONE_NUMBER_ID", "").strip()

        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": target_recipient.replace("+", "").replace(" ", "").replace("-", ""),
            "type": "text",
            "text": {"preview_url": False, "body": body},
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            data = response.json() if response.content else {}
            if response.status_code in (200, 201):
                return {
                    "status": "sent",
                    "details": {
                        "provider": "Meta WhatsApp Cloud API",
                        "status_code": response.status_code,
                        "meta_response": data,
                        "mock": False
                    }
                }
            else:
                return {
                    "status": "failed",
                    "details": {
                        "provider": "Meta WhatsApp Cloud API",
                        "status_code": response.status_code,
                        "error": data.get("error", {}).get("message", "Meta API request failed"),
                        "raw_response": data,
                        "mock": False
                    }
                }
        except Exception as exc:
            return {
                "status": "failed",
                "details": {
                    "provider": "Meta WhatsApp Cloud API",
                    "error": str(exc),
                    "mock": False
                }
            }
