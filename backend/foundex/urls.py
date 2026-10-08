from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(request):
    return JsonResponse({"status": "ok", "service": "foundex-api"})


admin.site.site_header = "FOUNDEX — администрирование"
admin.site.site_title = "FOUNDEX"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/", include("accounts.urls")),
    path("api/", include("startups.urls")),
]
