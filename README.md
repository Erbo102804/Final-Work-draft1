# FOUNDEX — платформа, соединяющая стартапы и инвесторов

> **Найди свою следующую возможность.** Founder → FOUNDEX ↔ Investor
>
> Команда **Cntrl-V** (МУЦА): Тимур — Frontend, Ербол — Backend, Азема — Financial Specialist.

Founder размещает стартап с цепляющим **Hook** и **Демо**. Инвестор ищет и фильтрует проекты и запрашивает доступ к приватной информации. После одобрения он видит финансы, условия и контакты и может написать Founder'у в чате:

**Hook → Интерес → Доступ → Контакт**

## Возможности

| Роль | Что умеет |
|---|---|
| **Founder** | Регистрация · создание профиля стартапа (публичная часть: Hook, проблема, решение, демо, команда, стадия, сумма; приватная часть: бизнес-модель, финансы, roadmap, техдетали, питч, условия) · черновик / публикация · статистика просмотров и интереса · одобрение или отклонение запросов на доступ · чат с инвестором |
| **Investor** | Регистрация · интересы (отрасли, стадии, размер чека, регион) · поиск и фильтры (отрасль, стадия, сумма, город, сортировка) · **рекомендации** (rule-based matching с объяснением причин) · избранное («Интересно») · запрос доступа · приватные данные и контакты после одобрения · чат |
| **DIRECT** | Инвестор действует сам: найти → доступ → контакт |
| **SUPPORTED** | Заявка в команду FOUNDEX; менеджер ведёт её по этапам *Поиск → Подбор → Знакомство → Встреча → Сделка*, подбирает стартапы и оставляет комментарии |
| **Команда FOUNDEX** | Обработка заявок SUPPORTED · Django-админка: модерация стартапов (скрыть/опубликовать), Топ-размещение (`is_featured`), пользователи |

## Технологический стек

```
React / Next.js 14 UI  ──►  REST API (Django REST Framework, JWT)  ──►  бизнес-логика Django  ──►  PostgreSQL
```

- `frontend/` — Next.js 14 (App Router). Запросы `/api/*` проксируются на Django, поэтому CORS не нужен.
- `backend/` — Django 5 + DRF + SimpleJWT + django-filter. Локально работает и на SQLite.
- `docker-compose.yml` — PostgreSQL, backend и frontend одной командой.

## Быстрый старт (Docker)

```bash
docker compose up --build
```

- Сайт: http://localhost:3000
- API: http://localhost:8000/api/
- Админка: http://localhost:8000/admin/

При старте автоматически применяются миграции и создаются демо-данные.

### Демо-аккаунты (пароль `foundex2026`)

| Email | Роль |
|---|---|
| `founder@foundex.demo` | Founder (3 стартапа, одобренный контакт с чатом) |
| `founder2@foundex.demo` | Founder |
| `investor@foundex.demo` | Investor (интересы заполнены, есть рекомендации) |
| `investor2@foundex.demo` | Investor (заявка SUPPORTED) |
| `admin@foundex.demo` | Команда FOUNDEX + суперпользователь админки |

На странице входа есть кнопки, которые подставляют эти данные.

## Запуск без Docker

**Backend** (Python 3.11+):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# PostgreSQL (по умолчанию — SQLite, если DATABASE_URL не задан):
export DATABASE_URL=postgres://foundex:foundex@127.0.0.1:5432/foundex
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 8000
```

**Frontend** (Node 18+):

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000, BACKEND_URL по умолчанию http://127.0.0.1:8000
```

## Тесты

```bash
cd backend && python manage.py test     # регистрация, права, полный путь Hook → Контакт, SUPPORTED
cd frontend && npm run lint && npm run build
```

## REST API

Авторизация: `Authorization: Bearer <access>`.

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/auth/register/` | Регистрация `{email, password, full_name, role: founder\|investor}` → токены |
| POST | `/api/auth/login/` | `{email, password}` → `{access, refresh}` |
| POST | `/api/auth/refresh/` | Обновить access-токен |
| GET/PATCH | `/api/auth/me/` | Профиль (+ `investor_profile` для инвестора) |
| GET | `/api/meta/choices/` | Справочники: отрасли, стадии, этапы |
| GET | `/api/startups/` | Каталог. Фильтры: `industry=a,b`, `stage=a,b`, `funding_min`, `funding_max`, `location`, `has_demo`, `search`, `ordering` |
| POST | `/api/startups/` | Создать стартап (Founder) |
| GET/PATCH/DELETE | `/api/startups/{id}/` | Карточка; приватные поля = `null` без доступа |
| GET | `/api/startups/mine/` | Мои стартапы |
| POST | `/api/startups/{id}/publish/`, `/unpublish/` | Публикация |
| POST/DELETE | `/api/startups/{id}/interest/` | «Интересно» (Investor) |
| POST | `/api/startups/{id}/request-access/` | Запросить доступ `{message}` |
| GET | `/api/startups/{id}/interested/` | Заинтересованные инвесторы (владелец) |
| GET | `/api/startups/recommended/` | Рекомендации с `match_score` и `match_reasons` |
| GET | `/api/interests/` | Избранное / входящий интерес |
| GET | `/api/access-requests/?box=incoming\|outgoing&status=` | Запросы на доступ |
| POST | `/api/access-requests/{id}/approve/`, `/reject/` | Ответ Founder'а |
| GET/POST | `/api/access-requests/{id}/messages/` | Чат (после одобрения) |
| GET/POST/PATCH | `/api/support-requests/` | Заявки SUPPORTED (команда меняет `step`, `team_notes`, `suggested_startup_ids`) |
| GET | `/api/dashboard/` | Статистика кабинета по роли |
| GET | `/api/stats/` | Публичная статистика |

## Структура

```
backend/
  foundex/          настройки, корневые URL
  accounts/         пользователь (email-логин, роли), профиль инвестора, регистрация, JWT
  startups/         стартапы, интерес, запросы доступа, чат, SUPPORTED, matching, seed_demo, тесты
frontend/
  app/              страницы: /, /login, /register, /startups, /startups/[id], /startups/new,
                    /dashboard, /connections, /connections/[id], /support, /profile
  components/       Navbar, StartupForm, UI-компоненты
  lib/              API-клиент (JWT + refresh), контекст авторизации
```

## Дальнейшее развитие

- AI-matching: заменить `startups/matching.py` на модель, которая учитывает поведение инвестора.
- Платёжные шлюзы и платное Топ-10 размещение (поле `is_featured` уже есть).
- Email- и Telegram-уведомления о новых запросах и сообщениях.
