from rest_framework import serializers

from accounts.serializers import ContactUserSerializer, InvestorProfileSerializer, PublicUserSerializer

from .models import AccessRequest, Interest, Message, Startup, SupportRequest

PRIVATE_FIELDS = ["business_model", "financials", "roadmap", "tech_details", "pitch_deck_url", "terms"]


class StartupBriefSerializer(serializers.ModelSerializer):
    industry_display = serializers.CharField(source="get_industry_display", read_only=True)
    stage_display = serializers.CharField(source="get_stage_display", read_only=True)

    class Meta:
        model = Startup
        fields = [
            "id", "name", "hook", "industry", "industry_display", "stage", "stage_display",
            "funding_needed", "location", "team_size", "demo_url", "is_featured", "status",
        ]


class StartupSerializer(serializers.ModelSerializer):
    """Full card. Private fields are always writable by the owner but only readable with access."""

    founder = PublicUserSerializer(read_only=True)
    industry_display = serializers.CharField(source="get_industry_display", read_only=True)
    stage_display = serializers.CharField(source="get_stage_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    interest_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    has_access = serializers.SerializerMethodField()
    is_interested = serializers.SerializerMethodField()
    access_request = serializers.SerializerMethodField()
    founder_contacts = serializers.SerializerMethodField()

    class Meta:
        model = Startup
        fields = [
            "id", "founder", "name", "hook", "problem", "solution", "demo_url", "website",
            "industry", "industry_display", "stage", "stage_display", "location",
            "team_size", "team_description", "funding_needed",
            *PRIVATE_FIELDS,
            "status", "status_display", "is_featured", "views_count", "interest_count",
            "created_at", "updated_at", "published_at",
            "is_owner", "has_access", "is_interested", "access_request", "founder_contacts",
        ]
        read_only_fields = ["status", "is_featured", "views_count", "created_at", "updated_at", "published_at"]

    def _user(self):
        request = self.context.get("request")
        return request.user if request else None

    def _has_access(self, obj):
        cache = self.context.setdefault("_access_cache", {})
        if obj.pk not in cache:
            cache[obj.pk] = obj.has_private_access(self._user())
        return cache[obj.pk]

    def get_interest_count(self, obj):
        return obj.interests.count()

    def get_is_owner(self, obj):
        user = self._user()
        return bool(user and user.is_authenticated and user.id == obj.founder_id)

    def get_has_access(self, obj):
        return self._has_access(obj)

    def get_is_interested(self, obj):
        user = self._user()
        return bool(user and user.is_authenticated and obj.interests.filter(investor=user).exists())

    def get_access_request(self, obj):
        user = self._user()
        if not (user and user.is_authenticated and user.is_investor):
            return None
        req = obj.access_requests.filter(investor=user).first()
        return {"id": req.id, "status": req.status} if req else None

    def get_founder_contacts(self, obj):
        if not self._has_access(obj):
            return None
        return ContactUserSerializer(obj.founder).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self._has_access(instance):
            for field in PRIVATE_FIELDS:
                data[field] = None
        return data


class InterestSerializer(serializers.ModelSerializer):
    startup = StartupBriefSerializer(read_only=True)
    investor = PublicUserSerializer(read_only=True)
    investor_company = serializers.SerializerMethodField()

    class Meta:
        model = Interest
        fields = ["id", "startup", "investor", "investor_company", "created_at"]

    def get_investor_company(self, obj):
        profile = getattr(obj.investor, "investor_profile", None)
        return profile.company if profile else ""


class AccessRequestSerializer(serializers.ModelSerializer):
    startup = StartupBriefSerializer(read_only=True)
    startup_id = serializers.PrimaryKeyRelatedField(
        source="startup", queryset=Startup.objects.filter(status=Startup.Status.PUBLISHED), write_only=True
    )
    investor = serializers.SerializerMethodField()
    investor_profile = serializers.SerializerMethodField()
    founder = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = AccessRequest
        fields = [
            "id", "startup", "startup_id", "investor", "investor_profile", "founder", "message",
            "status", "status_display", "created_at", "responded_at", "unread_count", "last_message",
        ]
        read_only_fields = ["status", "created_at", "responded_at"]

    def _approved(self, obj):
        return obj.status == AccessRequest.Status.APPROVED

    def get_investor(self, obj):
        serializer = ContactUserSerializer if self._approved(obj) else PublicUserSerializer
        return serializer(obj.investor).data

    def get_investor_profile(self, obj):
        profile = getattr(obj.investor, "investor_profile", None)
        return InvestorProfileSerializer(profile).data if profile else None

    def get_founder(self, obj):
        serializer = ContactUserSerializer if self._approved(obj) else PublicUserSerializer
        return serializer(obj.startup.founder).data

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()

    def get_last_message(self, obj):
        message = obj.messages.order_by("-created_at").first()
        return MessageSerializer(message).data if message else None

    def validate(self, attrs):
        request = self.context["request"]
        startup = attrs["startup"]
        if startup.founder_id == request.user.id:
            raise serializers.ValidationError("Нельзя запросить доступ к своему стартапу.")
        if AccessRequest.objects.filter(investor=request.user, startup=startup).exists():
            raise serializers.ValidationError("Вы уже отправили запрос на доступ к этому стартапу.")
        return attrs


class MessageSerializer(serializers.ModelSerializer):
    sender = PublicUserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "text", "is_read", "created_at"]
        read_only_fields = ["is_read", "created_at"]


class SupportRequestSerializer(serializers.ModelSerializer):
    requester = PublicUserSerializer(read_only=True)
    manager = PublicUserSerializer(read_only=True)
    startup = StartupBriefSerializer(read_only=True)
    startup_id = serializers.PrimaryKeyRelatedField(
        source="startup", queryset=Startup.objects.all(), write_only=True, required=False, allow_null=True
    )
    suggested_startups = StartupBriefSerializer(many=True, read_only=True)
    step_display = serializers.CharField(source="get_step_display", read_only=True)

    class Meta:
        model = SupportRequest
        fields = [
            "id", "requester", "startup", "startup_id", "goal", "budget", "step", "step_display",
            "manager", "team_notes", "suggested_startups", "created_at", "updated_at",
        ]
        read_only_fields = ["step", "team_notes", "created_at", "updated_at"]


class SupportRequestTeamSerializer(SupportRequestSerializer):
    """FOUNDEX team can move the request through the pipeline."""

    suggested_startup_ids = serializers.PrimaryKeyRelatedField(
        source="suggested_startups", queryset=Startup.objects.all(), many=True, write_only=True, required=False
    )

    class Meta(SupportRequestSerializer.Meta):
        fields = SupportRequestSerializer.Meta.fields + ["suggested_startup_ids"]
        read_only_fields = ["created_at", "updated_at"]
