from django.conf import settings
from django.db import models

from accounts.models import Industry, Stage


class Startup(models.Model):
    """A startup card: public part (Hook + Demo) and private part shown on approved access."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        PUBLISHED = "published", "Опубликован"
        HIDDEN = "hidden", "Скрыт модератором"

    founder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="startups")

    # Public
    name = models.CharField(max_length=120)
    hook = models.CharField(max_length=200, help_text="Одна цепляющая фраза")
    problem = models.TextField()
    solution = models.TextField()
    demo_url = models.URLField(blank=True, help_text="Ссылка на видео-демо (YouTube, Loom, ...)")
    website = models.URLField(blank=True)
    industry = models.CharField(max_length=16, choices=Industry.choices, default=Industry.OTHER)
    stage = models.CharField(max_length=16, choices=Stage.choices, default=Stage.IDEA)
    location = models.CharField(max_length=100, blank=True, default="Бишкек")
    team_size = models.PositiveSmallIntegerField(default=1)
    team_description = models.TextField(blank=True)
    funding_needed = models.PositiveIntegerField(default=0, help_text="USD")

    # Private (по запросу)
    business_model = models.TextField(blank=True)
    financials = models.TextField(blank=True)
    roadmap = models.TextField(blank=True)
    tech_details = models.TextField(blank=True)
    pitch_deck_url = models.URLField(blank=True)
    terms = models.TextField(blank=True, help_text="Условия инвестирования")

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    is_featured = models.BooleanField(default=False, help_text="Топ-размещение")
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-is_featured", "-published_at", "-created_at"]

    def __str__(self):
        return self.name

    def has_private_access(self, user):
        if not user or not user.is_authenticated:
            return False
        if user.id == self.founder_id or user.is_foundex_team:
            return True
        return self.access_requests.filter(investor=user, status=AccessRequest.Status.APPROVED).exists()


class Interest(models.Model):
    """Investor marks a startup as interesting (saved). The founder sees who is interested."""

    investor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="interests")
    startup = models.ForeignKey(Startup, on_delete=models.CASCADE, related_name="interests")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["investor", "startup"], name="unique_interest")]


class AccessRequest(models.Model):
    """Hook -> Interest -> Access -> Contact. Approval opens private info and the chat."""

    class Status(models.TextChoices):
        PENDING = "pending", "Ожидает"
        APPROVED = "approved", "Одобрен"
        REJECTED = "rejected", "Отклонён"

    investor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="access_requests")
    startup = models.ForeignKey(Startup, on_delete=models.CASCADE, related_name="access_requests")
    message = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["investor", "startup"], name="unique_access_request")]

    def __str__(self):
        return f"{self.investor} → {self.startup} ({self.status})"

    def is_participant(self, user):
        return user.id in (self.investor_id, self.startup.founder_id) or user.is_foundex_team


class Message(models.Model):
    """Chat message between investor and founder inside an approved access request."""

    access_request = models.ForeignKey(AccessRequest, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class SupportRequest(models.Model):
    """SUPPORTED mode: FOUNDEX team helps with search, matching, intro, meeting and the deal."""

    class Step(models.TextChoices):
        NEW = "new", "Новая заявка"
        SEARCH = "search", "Поиск"
        MATCHING = "matching", "Подбор"
        INTRO = "intro", "Знакомство"
        MEETING = "meeting", "Встреча"
        DEAL = "deal", "Сделка"
        CLOSED = "closed", "Закрыта"

    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="support_requests")
    startup = models.ForeignKey(Startup, on_delete=models.SET_NULL, null=True, blank=True, related_name="support_requests")
    goal = models.TextField(help_text="Что нужно найти / какая помощь нужна")
    budget = models.PositiveIntegerField(default=0, help_text="USD")
    step = models.CharField(max_length=16, choices=Step.choices, default=Step.NEW)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="managed_support_requests"
    )
    team_notes = models.TextField(blank=True, help_text="Комментарий команды FOUNDEX для пользователя")
    suggested_startups = models.ManyToManyField(Startup, blank=True, related_name="suggested_in")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
