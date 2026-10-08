from django.contrib import admin

from .models import AccessRequest, Interest, Message, Startup, SupportRequest


@admin.register(Startup)
class StartupAdmin(admin.ModelAdmin):
    list_display = ["name", "founder", "industry", "stage", "funding_needed", "status", "is_featured", "views_count"]
    list_filter = ["status", "industry", "stage", "is_featured"]
    list_editable = ["status", "is_featured"]
    search_fields = ["name", "hook", "founder__email"]
    readonly_fields = ["views_count", "created_at", "updated_at", "published_at"]


@admin.register(AccessRequest)
class AccessRequestAdmin(admin.ModelAdmin):
    list_display = ["startup", "investor", "status", "created_at", "responded_at"]
    list_filter = ["status"]
    search_fields = ["startup__name", "investor__email"]


@admin.register(Interest)
class InterestAdmin(admin.ModelAdmin):
    list_display = ["startup", "investor", "created_at"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["access_request", "sender", "created_at", "is_read"]


@admin.register(SupportRequest)
class SupportRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "requester", "startup", "step", "manager", "budget", "created_at"]
    list_filter = ["step"]
    filter_horizontal = ["suggested_startups"]
