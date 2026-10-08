from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Industry, InvestorProfile, Stage, User


class InvestorProfileSerializer(serializers.ModelSerializer):
    industries = serializers.ListField(child=serializers.ChoiceField(choices=Industry.choices), required=False)
    stages = serializers.ListField(child=serializers.ChoiceField(choices=Stage.choices), required=False)

    class Meta:
        model = InvestorProfile
        fields = ["company", "investor_type", "industries", "stages", "ticket_min", "ticket_max", "location"]

    def validate(self, attrs):
        ticket_min = attrs.get("ticket_min", getattr(self.instance, "ticket_min", 0))
        ticket_max = attrs.get("ticket_max", getattr(self.instance, "ticket_max", 0))
        if ticket_max and ticket_min > ticket_max:
            raise serializers.ValidationError({"ticket_max": "Максимальный чек должен быть больше минимального."})
        return attrs


class UserSerializer(serializers.ModelSerializer):
    investor_profile = InvestorProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            "id", "email", "role", "full_name", "phone", "telegram", "linkedin", "bio",
            "investor_profile", "date_joined",
        ]
        read_only_fields = ["id", "email", "role", "date_joined"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.is_investor:
            data.pop("investor_profile", None)
        return data

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("investor_profile", None)
        instance = super().update(instance, validated_data)
        if profile_data is not None and instance.is_investor:
            profile, _ = InvestorProfile.objects.get_or_create(user=instance)
            serializer = InvestorProfileSerializer(profile, data=profile_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return instance


class PublicUserSerializer(serializers.ModelSerializer):
    """Minimal info that is safe to show to other users."""

    class Meta:
        model = User
        fields = ["id", "full_name", "role"]


class ContactUserSerializer(serializers.ModelSerializer):
    """Contact details, shown only after access is approved."""

    class Meta:
        model = User
        fields = ["id", "full_name", "role", "email", "phone", "telegram", "linkedin", "bio"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=[User.Role.FOUNDER, User.Role.INVESTOR])

    class Meta:
        model = User
        fields = ["email", "password", "full_name", "role"]

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует.")
        return value

    def validate(self, attrs):
        validate_password(attrs["password"], User(email=attrs.get("email"), full_name=attrs.get("full_name", "")))
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        if user.is_investor:
            InvestorProfile.objects.create(user=user)
        return user

    def to_representation(self, instance):
        refresh = RefreshToken.for_user(instance)
        return {
            "user": UserSerializer(instance).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
