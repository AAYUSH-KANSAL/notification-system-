from django.contrib import admin
from .models import Trigger, ChannelTemplate, WebPushSubscription, NotificationLog


@admin.register(Trigger)
class TriggerAdmin(admin.ModelAdmin):
    list_display = ("id", "key", "name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("key", "name", "description")


@admin.register(ChannelTemplate)
class ChannelTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "trigger", "channel", "is_enabled", "status", "updated_at")
    list_filter = ("channel", "is_enabled", "status", "trigger")
    search_fields = ("title", "subject", "body")


@admin.register(WebPushSubscription)
class WebPushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("user__username", "user__email")


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ("id", "trigger_key", "channel", "recipient", "status", "created_at")
    list_filter = ("status", "channel", "trigger_key")
    search_fields = ("recipient", "payload", "response_details")
    readonly_fields = ("trigger_key", "channel", "recipient", "payload", "status", "response_details", "created_at")
