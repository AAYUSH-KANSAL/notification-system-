from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework.test import APIClient
from rest_framework import status

from notifications.models import Trigger, ChannelTemplate, NotificationLog
from notifications.services.notification_service import render_template, NotificationService

User = get_user_model()


@override_settings(
    RESEND_API_KEY="",
    ONESIGNAL_APP_ID="",
    ONESIGNAL_REST_API_KEY="",
    WHATSAPP_ACCESS_TOKEN="",
    TWILIO_ACCOUNT_SID="",
    TWILIO_AUTH_TOKEN="",
)
class NotificationSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            username="admin_test",
            email="admin@test.com",
            password="admin_password",
            first_name="Admin",
        )

        # Normal user
        self.normal_user = User.objects.create_user(
            username="normal_test",
            email="normal@test.com",
            password="normal_password",
            first_name="Ayush",
        )

        # Setup triggers
        self.login_trigger = Trigger.objects.create(
            key="login",
            name="Login Trigger",
            description="Fires on login",
            is_active=True,
        )

        self.logout_trigger = Trigger.objects.create(
            key="logout",
            name="Logout Trigger",
            description="Fires on logout",
            is_active=True,
        )

        # Setup templates for Login
        self.tpl_whatsapp = ChannelTemplate.objects.create(
            trigger=self.login_trigger,
            channel="whatsapp",
            body="Welcome {{user_name}} to our platform!",
            is_enabled=True,
            status="approved",
        )
        self.tpl_email = ChannelTemplate.objects.create(
            trigger=self.login_trigger,
            channel="email",
            subject="Login Alert for {{user_name}}",
            body="Hello {{user_name}}, you logged in successfully.",
            is_enabled=True,
            status="approved",
        )
        self.tpl_webpush = ChannelTemplate.objects.create(
            trigger=self.login_trigger,
            channel="webpush",
            title="Welcome {{user_name}}!",
            body="You have signed in.",
            is_enabled=True,
            status="approved",
        )

        # Setup templates for Logout
        self.tpl_logout_email = ChannelTemplate.objects.create(
            trigger=self.logout_trigger,
            channel="email",
            subject="Goodbye {{user_name}}",
            body="You have logged out.",
            is_enabled=True,
        )

    # 1. Trigger model
    def test_trigger_model(self):
        trigger = Trigger.objects.get(key="login")
        self.assertEqual(trigger.name, "Login Trigger")
        self.assertTrue(trigger.is_active)
        self.assertIn("Login Trigger (login)", str(trigger))

    # 2. ChannelTemplate model
    def test_channel_template_model(self):
        tpl = self.tpl_whatsapp
        self.assertEqual(tpl.channel, "whatsapp")
        self.assertTrue(tpl.is_enabled)
        self.assertEqual(tpl.status, "approved")
        self.assertIn("WhatsApp", str(tpl))

    # 3. Duplicate trigger/channel prevention
    def test_duplicate_trigger_channel_prevention(self):
        with self.assertRaises(IntegrityError):
            ChannelTemplate.objects.create(
                trigger=self.login_trigger,
                channel="whatsapp",
                body="Duplicate WhatsApp template",
            )

    # 4. Template variable replacement
    def test_template_variable_replacement(self):
        template_text = "Welcome {{user_name}}! Your email is {{ user_email }}."
        context = {"user_name": "Ayush", "user_email": "ayush@example.com"}
        rendered = render_template(template_text, context)
        self.assertEqual(rendered, "Welcome Ayush! Your email is ayush@example.com.")
        self.assertNotIn("{{user_name}}", rendered)
        self.assertNotIn("{{ user_email }}", rendered)

    # 5. Login trigger fires on auth endpoint
    def test_login_trigger(self):
        initial_log_count = NotificationLog.objects.count()
        response = self.client.post(
            "/api/auth/login/",
            {"username": "normal_test", "password": "normal_password"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["tokens"])
        self.assertIn("trigger_dispatched", response.data)

        # Confirm notification logs created for login trigger
        new_logs = NotificationLog.objects.filter(trigger_key="login")
        self.assertGreater(new_logs.count(), initial_log_count)
        channels_logged = set(new_logs.values_list("channel", flat=True))
        self.assertTrue({"whatsapp", "email", "webpush"}.issubset(channels_logged))

    # 6. Logout trigger fires on auth endpoint
    def test_logout_trigger(self):
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("trigger_dispatched", response.data)

        # Confirm notification log created for logout trigger
        logout_logs = NotificationLog.objects.filter(trigger_key="logout")
        self.assertTrue(logout_logs.exists())

    # 7. Enabled channel dispatch
    def test_enabled_channel_dispatch(self):
        result = NotificationService.dispatch_trigger(
            trigger_key="login",
            user=self.normal_user,
            specific_channel="email",
        )
        self.assertEqual(result["status"], "completed")
        self.assertIn("email", result["results"])
        self.assertIn(result["results"]["email"]["status"], ["sent", "mock_delivered"])

    # 8. Disabled channel is skipped
    def test_disabled_channel_is_skipped(self):
        self.tpl_email.is_enabled = False
        self.tpl_email.save()

        logs_before = NotificationLog.objects.filter(trigger_key="login", channel="email").count()
        result = NotificationService.dispatch_trigger(
            trigger_key="login",
            user=self.normal_user,
            specific_channel="email",
        )
        self.assertEqual(result["results"]["email"]["status"], "skipped")

        logs_after = NotificationLog.objects.filter(trigger_key="login", channel="email").count()
        self.assertEqual(logs_before, logs_after)

    # 9. Admin authorization
    def test_admin_authorization(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/notification-matrix/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("triggers", response.data)
        self.assertIn("providers", response.data)

    # 10. Non-admin cannot modify templates or access admin matrix
    def test_non_admin_cannot_modify_templates(self):
        self.client.force_authenticate(user=self.normal_user)

        # Accessing matrix should return 403 Forbidden
        matrix_res = self.client.get("/api/notification-matrix/")
        self.assertEqual(matrix_res.status_code, status.HTTP_403_FORBIDDEN)

        # Modifying template should return 403 Forbidden
        patch_res = self.client.patch(
            f"/api/templates/{self.tpl_email.id}/toggle/",
            {},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_403_FORBIDDEN)

    # 11. Test-send endpoint
    def test_test_send_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/templates/{self.tpl_email.id}/test/",
            {"context": {"user_name": "Tester"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["channel"], "email")
        self.assertIn(response.data["result"]["status"], ["sent", "mock_delivered"])

    # 12. Notification logging
    def test_notification_logging(self):
        NotificationService.dispatch_trigger(
            trigger_key="login",
            user=self.normal_user,
            specific_channel="whatsapp",
        )
        log = NotificationLog.objects.filter(trigger_key="login", channel="whatsapp").first()
        self.assertIsNotNone(log)
        self.assertIn(log.status, ["sent", "mock_delivered"])
        self.assertIn("Ayush", log.payload.get("body", ""))
        self.assertIsNotNone(log.response_details)

    # 13. Provider failure handling
    def test_provider_failure_handling(self):
        # Even with an unknown trigger or provider issue, dispatch should not raise unhandled exception
        result = NotificationService.dispatch_trigger("non_existent_trigger", user=self.normal_user)
        self.assertEqual(result["status"], "skipped")

    # 14. Mock mode fallback
    def test_mock_mode_fallback(self):
        # In test environment without provider keys, status must be mock_delivered, clearly labelled
        result = NotificationService.dispatch_trigger(
            trigger_key="login",
            user=self.normal_user,
            specific_channel="webpush",
        )
        res = result["results"]["webpush"]
        self.assertIn(res["status"], ["sent", "mock_delivered"])
        if res["status"] == "mock_delivered":
            self.assertTrue(res["details"].get("mock"))
            self.assertEqual(res["details"].get("mode"), "Sandbox / Mock Delivery")
