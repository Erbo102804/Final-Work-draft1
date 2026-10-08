from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import InvestorProfile, User

from .filters import StartupFilter
from .matching import recommend
from .models import AccessRequest, Interest, Message, Startup, SupportRequest
from .permissions import IsFounder, IsInvestor
from .serializers import (
    AccessRequestSerializer,
    InterestSerializer,
    MessageSerializer,
    StartupBriefSerializer,
    StartupSerializer,
    SupportRequestSerializer,
    SupportRequestTeamSerializer,
)


class StartupViewSet(viewsets.ModelViewSet):
    """Startup cards.

    The public catalog lists only published startups. Founders manage their own cards,
    investors express interest and request access to private information.
    """

    serializer_class = StartupSerializer
    filterset_class = StartupFilter
    search_fields = ["name", "hook", "problem", "solution", "team_description"]
    ordering_fields = ["published_at", "created_at", "funding_needed", "views_count", "team_size"]

    def get_queryset(self):
        qs = Startup.objects.select_related("founder")
        user = self.request.user
        if self.action == "list":
            return qs.filter(status=Startup.Status.PUBLISHED)
        if user.is_authenticated and user.is_foundex_team:
            return qs
        if user.is_authenticated:
            return qs.filter(Q(status=Startup.Status.PUBLISHED) | Q(founder=user))
        return qs.filter(status=Startup.Status.PUBLISHED)

    def get_permissions(self):
        if self.action == "create":
            return [IsFounder()]
        if self.action in ("interest", "request_access", "recommended"):
            return [IsInvestor()]
        if self.action in ("mine",):
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def _check_owner(self, startup):
        if startup.founder_id != self.request.user.id and not self.request.user.is_foundex_team:
            raise PermissionDenied("Только владелец стартапа может выполнить это действие.")

    def perform_create(self, serializer):
        serializer.save(founder=self.request.user)

    def perform_update(self, serializer):
        self._check_owner(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_owner(instance)
        instance.delete()

    def retrieve(self, request, *args, **kwargs):
        startup = self.get_object()
        if not request.user.is_authenticated or request.user.id != startup.founder_id:
            Startup.objects.filter(pk=startup.pk).update(views_count=F("views_count") + 1)
            startup.views_count += 1
        return Response(self.get_serializer(startup).data)

    @action(detail=False)
    def mine(self, request):
        startups = Startup.objects.filter(founder=request.user).annotate(
            pending_requests=Count("access_requests", filter=Q(access_requests__status=AccessRequest.Status.PENDING))
        )
        data = self.get_serializer(startups, many=True).data
        for item, startup in zip(data, startups):
            item["pending_requests"] = startup.pending_requests
        return Response(data)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        startup = self.get_object()
        self._check_owner(startup)
        if startup.status == Startup.Status.HIDDEN and not request.user.is_foundex_team:
            raise ValidationError("Стартап скрыт модератором. Свяжитесь с командой FOUNDEX.")
        missing = [f for f in ("name", "hook", "problem", "solution") if not getattr(startup, f)]
        if missing:
            raise ValidationError({"detail": "Заполните обязательные поля перед публикацией.", "fields": missing})
        startup.status = Startup.Status.PUBLISHED
        startup.published_at = startup.published_at or timezone.now()
        startup.save(update_fields=["status", "published_at", "updated_at"])
        return Response(self.get_serializer(startup).data)

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        startup = self.get_object()
        self._check_owner(startup)
        if startup.status == Startup.Status.PUBLISHED:
            startup.status = Startup.Status.DRAFT
            startup.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(startup).data)

    @action(detail=True, methods=["post", "delete"])
    def interest(self, request, pk=None):
        startup = self.get_object()
        if request.method == "DELETE":
            Interest.objects.filter(investor=request.user, startup=startup).delete()
            return Response({"is_interested": False})
        Interest.objects.get_or_create(investor=request.user, startup=startup)
        return Response({"is_interested": True}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="request-access")
    def request_access(self, request, pk=None):
        startup = self.get_object()
        serializer = AccessRequestSerializer(
            data={"startup_id": startup.id, "message": request.data.get("message", "")},
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(investor=request.user)
        Interest.objects.get_or_create(investor=request.user, startup=startup)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True)
    def interested(self, request, pk=None):
        startup = self.get_object()
        self._check_owner(startup)
        interests = startup.interests.select_related("investor__investor_profile", "startup")
        return Response(InterestSerializer(interests, many=True).data)

    @action(detail=False)
    def recommended(self, request):
        profile, _ = InvestorProfile.objects.get_or_create(user=request.user)
        queryset = Startup.objects.filter(status=Startup.Status.PUBLISHED).select_related("founder")
        results = []
        for score, startup, reasons in recommend(profile, queryset):
            item = StartupBriefSerializer(startup).data
            item["match_score"] = score
            item["match_reasons"] = reasons
            results.append(item)
        return Response(results)


class InterestViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Investor: saved startups. Founder: investors interested in my startups."""

    serializer_class = InterestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        qs = Interest.objects.select_related("startup", "investor__investor_profile")
        if user.is_investor:
            return qs.filter(investor=user)
        return qs.filter(startup__founder=user)


class AccessRequestViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    serializer_class = AccessRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        qs = AccessRequest.objects.select_related(
            "startup__founder", "investor__investor_profile"
        ).prefetch_related("messages")
        if not user.is_foundex_team:
            qs = qs.filter(Q(investor=user) | Q(startup__founder=user))
        box = self.request.query_params.get("box")
        if box == "incoming":
            qs = qs.filter(startup__founder=user)
        elif box == "outgoing":
            qs = qs.filter(investor=user)
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def get_permissions(self):
        if self.action == "create":
            return [IsInvestor()]
        return super().get_permissions()

    def perform_create(self, serializer):
        access_request = serializer.save(investor=self.request.user)
        Interest.objects.get_or_create(investor=self.request.user, startup=access_request.startup)

    def _respond(self, request, new_status):
        access_request = self.get_object()
        if access_request.startup.founder_id != request.user.id:
            raise PermissionDenied("Только Founder стартапа может ответить на запрос.")
        access_request.status = new_status
        access_request.responded_at = timezone.now()
        access_request.save(update_fields=["status", "responded_at"])
        return Response(self.get_serializer(access_request).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._respond(request, AccessRequest.Status.APPROVED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._respond(request, AccessRequest.Status.REJECTED)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        access_request = self.get_object()
        if access_request.status != AccessRequest.Status.APPROVED:
            raise ValidationError("Чат доступен после одобрения запроса на доступ.")
        if request.method == "POST":
            text = (request.data.get("text") or "").strip()
            if not text:
                raise ValidationError({"text": "Сообщение не может быть пустым."})
            message = Message.objects.create(access_request=access_request, sender=request.user, text=text)
            return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
        access_request.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        messages = access_request.messages.select_related("sender")
        return Response(MessageSerializer(messages, many=True).data)


class SupportRequestViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """SUPPORTED mode: users submit requests, FOUNDEX team moves them through the pipeline."""

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = SupportRequest.objects.select_related("requester", "manager", "startup").prefetch_related(
            "suggested_startups"
        )
        user = self.request.user
        return qs if user.is_foundex_team else qs.filter(requester=user)

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.is_foundex_team:
            return SupportRequestTeamSerializer
        return SupportRequestSerializer

    def perform_create(self, serializer):
        startup = serializer.validated_data.get("startup")
        user = self.request.user
        if startup and user.is_founder and startup.founder_id != user.id:
            raise ValidationError({"startup_id": "Можно выбрать только свой стартап."})
        serializer.save(requester=user)

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_foundex_team and serializer.instance.requester_id != user.id:
            raise PermissionDenied()
        if user.is_foundex_team and not serializer.instance.manager_id:
            serializer.save(manager=user)
        else:
            serializer.save()


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        support = SupportRequest.objects.filter(requester=user).exclude(step=SupportRequest.Step.CLOSED).count()
        unread = Message.objects.filter(
            Q(access_request__investor=user) | Q(access_request__startup__founder=user), is_read=False
        ).exclude(sender=user).count()

        if user.is_founder:
            startups = Startup.objects.filter(founder=user)
            requests = AccessRequest.objects.filter(startup__founder=user)
            data = {
                "startups_total": startups.count(),
                "startups_published": startups.filter(status=Startup.Status.PUBLISHED).count(),
                "views_total": sum(startups.values_list("views_count", flat=True)),
                "interests_total": Interest.objects.filter(startup__founder=user).count(),
                "requests_pending": requests.filter(status=AccessRequest.Status.PENDING).count(),
                "connections": requests.filter(status=AccessRequest.Status.APPROVED).count(),
            }
        elif user.is_investor:
            requests = AccessRequest.objects.filter(investor=user)
            data = {
                "saved": Interest.objects.filter(investor=user).count(),
                "requests_pending": requests.filter(status=AccessRequest.Status.PENDING).count(),
                "connections": requests.filter(status=AccessRequest.Status.APPROVED).count(),
                "startups_available": Startup.objects.filter(status=Startup.Status.PUBLISHED).count(),
            }
        else:
            data = {
                "users": User.objects.count(),
                "startups_published": Startup.objects.filter(status=Startup.Status.PUBLISHED).count(),
                "support_open": SupportRequest.objects.exclude(step=SupportRequest.Step.CLOSED).count(),
                "requests_total": AccessRequest.objects.count(),
            }
        data.update({"role": user.role, "unread_messages": unread, "support_open_mine": support})
        return Response(data)


class PublicStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "startups": Startup.objects.filter(status=Startup.Status.PUBLISHED).count(),
            "founders": User.objects.filter(role=User.Role.FOUNDER).count(),
            "investors": User.objects.filter(role=User.Role.INVESTOR).count(),
            "connections": AccessRequest.objects.filter(status=AccessRequest.Status.APPROVED).count(),
        })
