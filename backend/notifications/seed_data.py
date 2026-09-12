"""Seed data script module for Notification Management System."""
from django.conf import settings
from django.contrib.auth import get_user_model
from notifications.models import Trigger, ChannelTemplate

User = get_user_model()


def run_seed():
    """Populates initial triggers, templates, and demonstration users."""
    print("[SEED] Starting database seeding...")

    # 1. Create Triggers
    login_trigger, _ = Trigger.objects.update_or_create(
        key="login",
        defaults={
            "name": "Login",
            "description": "Fires automatically when a user logs into the system",
            "is_active": True,
        },
    )

    logout_trigger, _ = Trigger.objects.update_or_create(
        key="logout",
        defaults={
            "name": "Logout",
            "description": "Fires automatically when a user logs out of the system",
            "is_active": True,
        },
    )
    print("  [+] Created triggers: Login, Logout")

    # 2. Create Channel Templates for Login
    ChannelTemplate.objects.update_or_create(
        trigger=login_trigger,
        channel="whatsapp",
        defaults={
            "title": "",
            "subject": "",
            "body": "Welcome back, {{user_name}}!",
            "status": "approved",
            "is_enabled": True,
        },
    )

    ChannelTemplate.objects.update_or_create(
        trigger=login_trigger,
        channel="email",
        defaults={
            "title": "",
            "subject": "Successful Login",
            "body": "Hello {{user_name}}, you successfully logged in.",
            "status": "approved",
            "is_enabled": True,
        },
    )

    ChannelTemplate.objects.update_or_create(
        trigger=login_trigger,
        channel="webpush",
        defaults={
            "title": "Welcome Back!",
            "subject": "",
            "body": "Hello {{user_name}}, you are logged in.",
            "status": "approved",
            "is_enabled": True,
        },
    )

    # 3. Create Channel Templates for Logout
    ChannelTemplate.objects.update_or_create(
        trigger=logout_trigger,
        channel="whatsapp",
        defaults={
            "title": "",
            "subject": "",
            "body": "You have successfully logged out.",
            "status": "approved",
            "is_enabled": True,
        },
    )

    ChannelTemplate.objects.update_or_create(
        trigger=logout_trigger,
        channel="email",
        defaults={
            "title": "",
            "subject": "Logout Successful",
            "body": "{{user_name}}, you have successfully logged out.",
            "status": "approved",
            "is_enabled": True,
        },
    )

    ChannelTemplate.objects.update_or_create(
        trigger=logout_trigger,
        channel="webpush",
        defaults={
            "title": "See You Again!",
            "subject": "",
            "body": "You have successfully logged out.",
            "status": "approved",
            "is_enabled": True,
        },
    )
    print("  [+] Created 6 initial templates (WhatsApp, Email, WebPush for Login & Logout)")

    resend_recipient = getattr(settings, "RESEND_TEST_RECIPIENT", "").strip()
    admin_email = resend_recipient or "admin@notification.system"
    demo_email = resend_recipient or "ayush@notification.system"

    # 4. Create Demo Admin and Demo User accounts
    admin_user = User.objects.filter(username="admin").first()
    if not admin_user:
        admin_user = User.objects.create_superuser(
            username="admin",
            email=admin_email,
            password="admin123",
            first_name="Admin",
            last_name="Manager",
        )
        print(f"  [+] Created Admin user: {admin_email} / admin123")
    else:
        admin_user.set_password("admin123")
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.email = admin_email
        admin_user.save()
        print("  [+] Updated Admin user credentials")

    demo_user = User.objects.filter(username="ayush").first()
    if not demo_user:
        demo_user = User.objects.create_user(
            username="ayush",
            email=demo_email,
            password="user123",
            first_name="Ayush",
            last_name="Sharma",
        )
        print(f"  [+] Created Demo Normal User: {demo_email} / user123 (username: ayush)")
    else:
        demo_user.set_password("user123")
        demo_user.email = demo_email
        demo_user.save()
        print("  [+] Updated Demo Normal User credentials")

    print("[SUCCESS] Database seeding completed successfully!")
