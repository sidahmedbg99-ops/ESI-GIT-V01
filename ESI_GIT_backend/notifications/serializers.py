from rest_framework import serializers
from .models import Notification


class AdminSendNotificationSerializer(serializers.Serializer):
    """
    Admin can send:
    - to ALL users
    - to all students
    - to all staff
    - to specific user
    """

    recipient_type = serializers.ChoiceField(choices=["all", "student", "staff"])

    recipient_id = serializers.IntegerField(required=False)

    title = serializers.CharField(max_length=255)
    message = serializers.CharField()

    def validate(self, data):
        # If sending to specific user → recipient_id required
        if data["recipient_type"] in ["student", "staff"] and not data.get(
            "recipient_id"
        ):
            raise serializers.ValidationError(
                "recipient_id is required when sending to specific user"
            )
        return data


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
