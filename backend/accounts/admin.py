from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import InvestorProfile, User


class InvestorProfileInline(admin.StackedInline):
    model = InvestorProfile
    can_delete = False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "full_name", "role", "is_active", "date_joined"]
    list_filter = ["role", "is_active", "is_staff"]
    search_fields = ["email", "full_name"]
    ordering = ["-date_joined"]
    inlines = [InvestorProfileInline]
    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("Профиль", {"fields": ("full_name", "role", "phone", "telegram", "linkedin", "bio")}),
        ("Права", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Даты", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "username", "role", "password1", "password2")}),
    )
