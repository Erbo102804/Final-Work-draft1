from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import InvestorProfile, User
from startups.models import AccessRequest, Interest, Message, Startup, SupportRequest

DEMO_PASSWORD = "foundex2026"

STARTUPS = [
    {
        "name": "AgroSense", "industry": "agritech", "stage": "mvp", "funding_needed": 50000, "team_size": 4,
        "hook": "Датчики влажности за $15 экономят фермерам Кыргызстана до 40% воды.",
        "problem": "Фермеры поливают «на глаз» и теряют урожай и воду.",
        "solution": "Дешёвые IoT-датчики + Telegram-бот с рекомендациями по поливу.",
        "demo_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "business_model": "Продажа датчиков + подписка $3/мес на аналитику.",
        "financials": "Пилот: 35 фермерских хозяйств, MRR $420.",
        "roadmap": "Q1 — 300 хозяйств в Чуйской области, Q3 — Казахстан.",
        "terms": "$50 000 за 10% (SAFE).",
    },
    {
        "name": "EduBridge", "industry": "edtech", "stage": "early", "funding_needed": 120000, "team_size": 6,
        "hook": "Подготовка к ОРТ с AI-репетитором за цену одного занятия в месяц.",
        "problem": "Качественные репетиторы дорогие и недоступны в регионах.",
        "solution": "Адаптивная платформа с AI-объяснениями на кыргызском и русском.",
        "business_model": "Freemium, подписка 490 сом/мес, B2B для школ.",
        "financials": "4 200 пользователей, 610 платящих, рост 18% м/м.",
        "terms": "$120 000, оценка $1.2M pre-money.",
    },
    {
        "name": "PayLink KG", "industry": "fintech", "stage": "growth", "funding_needed": 300000, "team_size": 11,
        "hook": "Приём оплат для малого бизнеса по QR за 5 минут без банка.",
        "problem": "Малый бизнес теряет клиентов без безналичной оплаты.",
        "solution": "QR-касса в смартфоне с подключением ко всем локальным кошелькам.",
        "business_model": "Комиссия 0.9% с транзакции.",
        "financials": "Оборот $1.1M/мес, выручка $9.9K/мес.",
    },
    {
        "name": "MedQueue", "industry": "healthtech", "stage": "idea", "funding_needed": 20000, "team_size": 2,
        "hook": "Электронная очередь в поликлиники — без ожидания в коридоре.",
        "problem": "Пациенты часами стоят в очередях к врачам.",
        "solution": "Онлайн-запись и SMS-уведомление о приближении очереди.",
    },
    {
        "name": "TourNomad", "industry": "tourism", "stage": "mvp", "funding_needed": 40000, "team_size": 3,
        "hook": "Бронирование юрт и конных туров Иссык-Куля в один клик.",
        "problem": "Локальные гиды не представлены в онлайне, туристы не находят их.",
        "solution": "Маркетплейс аутентичных туров с проверенными гидами.",
    },
    {
        "name": "CargoMind", "industry": "logistics", "stage": "early", "funding_needed": 80000, "team_size": 5,
        "hook": "AI собирает попутные грузы и снижает стоимость доставки по ЦА на 30%.",
        "problem": "Грузовики возвращаются пустыми — до 45% рейсов.",
        "solution": "Платформа сборных грузов с AI-маршрутизацией.",
    },
]


class Command(BaseCommand):
    help = "Создаёт демо-данные: команду, founders, investors, стартапы, запросы и сообщения."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Удалить существующие демо-данные перед созданием")

    def _user(self, email, role, full_name, **extra):
        user, created = User.objects.get_or_create(
            email=email, defaults={"username": email, "role": role, "full_name": full_name, **extra}
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        return user

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            User.objects.filter(email__endswith="@foundex.demo").delete()

        admin = self._user("admin@foundex.demo", User.Role.ADMIN, "Команда FOUNDEX", is_staff=True, is_superuser=True)
        founder1 = self._user("founder@foundex.demo", User.Role.FOUNDER, "Айбек Founder", telegram="@aibek_founder")
        founder2 = self._user("founder2@foundex.demo", User.Role.FOUNDER, "Нурай Founder", telegram="@nurai_f")
        investor1 = self._user("investor@foundex.demo", User.Role.INVESTOR, "Азамат Investor", telegram="@azamat_inv")
        investor2 = self._user("investor2@foundex.demo", User.Role.INVESTOR, "Елена Investor")

        InvestorProfile.objects.update_or_create(user=investor1, defaults={
            "company": "Tengri Angels", "investor_type": "angel", "industries": ["agritech", "edtech", "fintech"],
            "stages": ["mvp", "early"], "ticket_min": 20000, "ticket_max": 150000, "location": "Бишкек",
        })
        InvestorProfile.objects.update_or_create(user=investor2, defaults={
            "company": "Silk Road Ventures", "investor_type": "vc", "industries": ["fintech", "logistics"],
            "stages": ["early", "growth"], "ticket_min": 100000, "ticket_max": 500000,
        })

        startups = []
        for index, data in enumerate(STARTUPS):
            founder = founder1 if index % 2 == 0 else founder2
            startup, _ = Startup.objects.get_or_create(name=data["name"], founder=founder, defaults={
                **data,
                "location": "Бишкек",
                "team_description": "Сильная техническая команда с опытом в индустрии.",
                "status": Startup.Status.PUBLISHED,
                "published_at": timezone.now(),
                "is_featured": index == 2,
            })
            startups.append(startup)

        Interest.objects.get_or_create(investor=investor1, startup=startups[1])
        approved, _ = AccessRequest.objects.get_or_create(
            investor=investor1, startup=startups[0],
            defaults={"message": "Интересует ваш пилот, хотим обсудить условия.",
                      "status": AccessRequest.Status.APPROVED, "responded_at": timezone.now()},
        )
        AccessRequest.objects.get_or_create(
            investor=investor2, startup=startups[2], defaults={"message": "Готовы обсудить раунд."}
        )
        if not approved.messages.exists():
            Message.objects.create(access_request=approved, sender=investor1, text="Здравствуйте! Можем созвониться на этой неделе?")
            Message.objects.create(access_request=approved, sender=founder1, text="Добрый день! Да, четверг в 15:00 подойдёт?")

        SupportRequest.objects.get_or_create(
            requester=investor2, goal="Ищем финтех-стартапы стадии early с выручкой от $5K/мес.",
            defaults={"budget": 250000, "step": SupportRequest.Step.MATCHING, "manager": admin,
                      "team_notes": "Подобрали 1 кандидата, готовим знакомство."},
        )

        self.stdout.write(self.style.SUCCESS(
            "Демо-данные готовы. Пароль для всех: %s\n"
            "  admin@foundex.demo (команда), founder@foundex.demo, founder2@foundex.demo,\n"
            "  investor@foundex.demo, investor2@foundex.demo" % DEMO_PASSWORD
        ))
