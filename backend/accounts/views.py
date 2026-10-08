from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Industry, InvestorProfile, Stage, User
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        if user.is_investor:
            InvestorProfile.objects.get_or_create(user=user)
        return user


def _choices(enum):
    return [{"value": value, "label": label} for value, label in enum.choices]


class ChoicesView(APIView):
    """Dictionaries for the frontend forms and filters."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from startups.models import SupportRequest

        return Response({
            "industries": _choices(Industry),
            "stages": _choices(Stage),
            "roles": _choices(User.Role),
            "investor_types": _choices(InvestorProfile.InvestorType),
            "support_steps": _choices(SupportRequest.Step),
        })
