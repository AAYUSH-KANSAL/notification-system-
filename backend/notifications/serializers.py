from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Trigger, ChannelTemplate, WebPushSubscription, NotificationLog

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_superuser",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            password=validated_data["password"],
        )
        return user


class ChannelTemplateSerializer(serializers.ModelSerializer):
    trigger_key = serializers.CharField(source="trigger.key", read_only=True)
    trigger_name = serializers.CharField(source="trigger.name", read_only=True)

    class Meta:
        model = ChannelTemplate
        fields = [
            "id",
            "trigger",
            "trigger_key",
            "trigger_name",
            "channel",
            "is_enabled",
            "title",
            "subject",
            "body",
            "status",
            "created_at",
            "updated_at",
        ]


class TriggerSerializer(serializers.ModelSerializer):
    templates = ChannelTemplateSerializer(many=True, read_only=True)

    class Meta:
        model = Trigger
        fields = [
            "id",
            "key",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
            "templates",
        ]


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = [
            "id",
            "trigger_key",
            "channel",
            "recipient",
            "payload",
            "status",
            "response_details",
            "created_at",
        ]


class WebPushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebPushSubscription
        fields = ["id", "user", "subscription_data", "is_active", "created_at"]
        read_only_fields = ["user"]
