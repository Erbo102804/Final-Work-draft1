from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("startups", views.StartupViewSet, basename="startup")
router.register("interests", views.InterestViewSet, basename="interest")
router.register("access-requests", views.AccessRequestViewSet, basename="access-request")
router.register("support-requests", views.SupportRequestViewSet, basename="support-request")

urlpatterns = [
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("stats/", views.PublicStatsView.as_view(), name="stats"),
    path("", include(router.urls)),
]
