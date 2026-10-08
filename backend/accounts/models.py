from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class Industry(models.TextChoices):
    FINTECH = "fintech", "FinTech"
    EDTECH = "edtech", "EdTech"
    HEALTHTECH = "healthtech", "HealthTech"
    ECOMMERCE = "ecommerce", "E-commerce"
    AGRITECH = "agritech", "AgriTech"
    AI = "ai", "AI / ML"
    SAAS = "saas", "SaaS"
    LOGISTICS = "logistics", "Логистика"
    TOURISM = "tourism", "Туризм"
    GREENTECH = "greentech", "GreenTech"
    OTHER = "other", "Другое"


class Stage(models.TextChoices):
    IDEA = "idea", "Идея"
    MVP = "mvp", "MVP"
    EARLY = "early", "Ранняя стадия"
    GROWTH = "growth", "Рост"
    SCALE = "scale", "Масштабирование"


class EmailUserManager(UserManager):
    def create_user(self, email=None, password=None, username=None, **extra_fields):
        return super().create_user(username or email, email, password, **extra_fields)

    def create_superuser(self, email=None, password=None, username=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.ADMIN)
        return super().create_superuser(username or email, email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        FOUNDER = "founder", "Founder"
        INVESTOR = "investor", "Investor"
        ADMIN = "admin", "FOUNDEX team"

    email = models.EmailField("email", unique=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.FOUNDER)
    full_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    telegram = models.CharField(max_length=64, blank=True)
    linkedin = models.URLField(blank=True)
    bio = models.TextField(blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = EmailUserManager()

    @property
    def is_founder(self):
        return self.role == self.Role.FOUNDER

    @property
    def is_investor(self):
        return self.role == self.Role.INVESTOR

    @property
    def is_foundex_team(self):
        return self.role == self.Role.ADMIN or self.is_staff

    def __str__(self):
        return self.full_name or self.email


class InvestorProfile(models.Model):
    """Investor interests used for search defaults and recommendations."""

    class InvestorType(models.TextChoices):
        ANGEL = "angel", "Бизнес-ангел"
        VC = "vc", "Венчурный фонд"
        CORPORATE = "corporate", "Корпоративный инвестор"
        ACCELERATOR = "accelerator", "Акселератор"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="investor_profile")
    company = models.CharField(max_length=150, blank=True)
    investor_type = models.CharField(max_length=16, choices=InvestorType.choices, default=InvestorType.ANGEL)
    industries = models.JSONField(default=list, blank=True)
    stages = models.JSONField(default=list, blank=True)
    ticket_min = models.PositiveIntegerField(default=0, help_text="USD")
    ticket_max = models.PositiveIntegerField(default=0, help_text="USD, 0 = без ограничения")
    location = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Профиль инвестора: {self.user}"
