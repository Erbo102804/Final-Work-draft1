from rest_framework import permissions


class IsFounder(permissions.BasePermission):
    message = "Действие доступно только для Founder."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_founder)


class IsInvestor(permissions.BasePermission):
    message = "Действие доступно только для Investor."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_investor)


class IsFoundexTeam(permissions.BasePermission):
    message = "Действие доступно только команде FOUNDEX."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_foundex_team)
