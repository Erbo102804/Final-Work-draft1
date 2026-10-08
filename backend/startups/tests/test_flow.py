from rest_framework.test import APITestCase

from accounts.models import InvestorProfile, User
from startups.models import AccessRequest, Startup

PASSWORD = "StrongPass123"


class FoundexFlowTests(APITestCase):
    def setUp(self):
        self.founder = User.objects.create_user(email="f@example.com", password=PASSWORD, role="founder")
        self.investor = User.objects.create_user(email="i@example.com", password=PASSWORD, role="investor",
                                                 telegram="@investor")
        InvestorProfile.objects.create(user=self.investor, industries=["agritech"], stages=["mvp"],
                                       ticket_min=10000, ticket_max=100000)
        self.team = User.objects.create_user(email="t@example.com", password=PASSWORD, role="admin")

    def auth(self, user):
        self.client.force_authenticate(user)

    def create_startup(self, **extra):
        self.auth(self.founder)
        data = {
            "name": "AgroSense", "hook": "Экономим воду", "problem": "Перерасход воды",
            "solution": "Датчики", "industry": "agritech", "stage": "mvp", "funding_needed": 50000,
            "financials": "MRR $400", "terms": "10% за $50K",
        }
        data.update(extra)
        response = self.client.post("/api/startups/", data)
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["id"]

    def test_full_direct_flow(self):
        startup_id = self.create_startup()

        # Draft is not in the public catalog
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/startups/").data["count"], 0)

        self.auth(self.founder)
        self.assertEqual(self.client.post(f"/api/startups/{startup_id}/publish/").status_code, 200)

        # Public card hides private fields
        self.client.force_authenticate(None)
        card = self.client.get(f"/api/startups/{startup_id}/").data
        self.assertEqual(card["hook"], "Экономим воду")
        self.assertIsNone(card["financials"])
        self.assertIsNone(card["founder_contacts"])

        # Investor: search, filter, recommendation, interest
        self.auth(self.investor)
        listing = self.client.get("/api/startups/", {"industry": "agritech,fintech", "funding_max": 60000})
        self.assertEqual(listing.data["count"], 1)
        self.assertEqual(self.client.get("/api/startups/", {"search": "Датчики"}).data["count"], 1)
        self.assertEqual(self.client.get("/api/startups/", {"stage": "growth"}).data["count"], 0)
        recommended = self.client.get("/api/startups/recommended/").data
        self.assertEqual(recommended[0]["id"], startup_id)
        self.assertEqual(recommended[0]["match_score"], 90)
        self.assertEqual(self.client.post(f"/api/startups/{startup_id}/interest/").status_code, 201)

        # Request access
        response = self.client.post(f"/api/startups/{startup_id}/request-access/", {"message": "Интересно"})
        self.assertEqual(response.status_code, 201, response.data)
        request_id = response.data["id"]
        duplicate = self.client.post(f"/api/startups/{startup_id}/request-access/", {"message": "Ещё раз"})
        self.assertEqual(duplicate.status_code, 400)

        # Chat is closed before approval, investor cannot approve own request
        self.assertEqual(self.client.get(f"/api/access-requests/{request_id}/messages/").status_code, 400)
        self.assertEqual(self.client.post(f"/api/access-requests/{request_id}/approve/").status_code, 403)

        # Founder sees interest and incoming request, approves
        self.auth(self.founder)
        self.assertEqual(len(self.client.get(f"/api/startups/{startup_id}/interested/").data), 1)
        incoming = self.client.get("/api/access-requests/", {"box": "incoming"}).data
        self.assertEqual(len(incoming), 1)
        self.assertNotIn("telegram", incoming[0]["investor"])
        approved = self.client.post(f"/api/access-requests/{request_id}/approve/")
        self.assertEqual(approved.data["status"], "approved")
        self.assertEqual(approved.data["investor"]["telegram"], "@investor")

        # Investor now sees private data and founder contacts, can chat
        self.auth(self.investor)
        card = self.client.get(f"/api/startups/{startup_id}/").data
        self.assertTrue(card["has_access"])
        self.assertEqual(card["financials"], "MRR $400")
        self.assertEqual(card["founder_contacts"]["email"], "f@example.com")
        sent = self.client.post(f"/api/access-requests/{request_id}/messages/", {"text": "Привет!"})
        self.assertEqual(sent.status_code, 201)

        self.auth(self.founder)
        self.assertEqual(self.client.get("/api/dashboard/").data["unread_messages"], 1)
        messages = self.client.get(f"/api/access-requests/{request_id}/messages/").data
        self.assertEqual(messages[0]["text"], "Привет!")
        self.assertEqual(self.client.get("/api/dashboard/").data["unread_messages"], 0)

    def test_permissions(self):
        startup_id = self.create_startup()
        other = User.objects.create_user(email="o@example.com", password=PASSWORD, role="founder")

        # Investor cannot create startups
        self.auth(self.investor)
        self.assertEqual(self.client.post("/api/startups/", {"name": "x"}).status_code, 403)
        # Other users cannot see drafts
        self.assertEqual(self.client.get(f"/api/startups/{startup_id}/").status_code, 404)

        self.auth(self.founder)
        self.client.post(f"/api/startups/{startup_id}/publish/")

        # Other founder cannot edit, publish, or request access
        self.auth(other)
        self.assertEqual(self.client.patch(f"/api/startups/{startup_id}/", {"name": "Hack"}).status_code, 403)
        self.assertEqual(self.client.post(f"/api/startups/{startup_id}/request-access/").status_code, 403)
        self.assertEqual(self.client.delete(f"/api/startups/{startup_id}/").status_code, 403)

        # Owner can edit, but not status fields
        self.auth(self.founder)
        response = self.client.patch(f"/api/startups/{startup_id}/", {"name": "AgroSense 2", "is_featured": True})
        self.assertEqual(response.data["name"], "AgroSense 2")
        self.assertFalse(response.data["is_featured"])
        self.assertEqual(len(self.client.get("/api/startups/mine/").data), 1)

    def test_rejected_request_keeps_data_private(self):
        startup_id = self.create_startup()
        self.client.post(f"/api/startups/{startup_id}/publish/")
        self.auth(self.investor)
        request_id = self.client.post(f"/api/startups/{startup_id}/request-access/").data["id"]
        self.auth(self.founder)
        self.client.post(f"/api/access-requests/{request_id}/reject/")
        self.auth(self.investor)
        card = self.client.get(f"/api/startups/{startup_id}/").data
        self.assertFalse(card["has_access"])
        self.assertIsNone(card["terms"])
        self.assertEqual(card["access_request"]["status"], AccessRequest.Status.REJECTED)

    def test_views_counter(self):
        startup_id = self.create_startup()
        self.client.post(f"/api/startups/{startup_id}/publish/")
        self.client.get(f"/api/startups/{startup_id}/")  # owner — not counted
        self.auth(self.investor)
        self.client.get(f"/api/startups/{startup_id}/")
        self.assertEqual(Startup.objects.get(pk=startup_id).views_count, 1)

    def test_supported_mode_pipeline(self):
        startup_id = self.create_startup()
        self.client.post(f"/api/startups/{startup_id}/publish/")

        self.auth(self.investor)
        response = self.client.post("/api/support-requests/", {"goal": "Найти agritech", "budget": 50000})
        self.assertEqual(response.status_code, 201, response.data)
        support_id = response.data["id"]
        # User cannot move the pipeline
        response = self.client.patch(f"/api/support-requests/{support_id}/", {"step": "deal"})
        self.assertEqual(response.data["step"], "new")

        self.auth(self.team)
        response = self.client.patch(f"/api/support-requests/{support_id}/", {
            "step": "intro", "team_notes": "Знакомим с AgroSense", "suggested_startup_ids": [startup_id],
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["manager"]["id"], self.team.id)

        self.auth(self.investor)
        data = self.client.get(f"/api/support-requests/{support_id}/").data
        self.assertEqual(data["step"], "intro")
        self.assertEqual(data["suggested_startups"][0]["id"], startup_id)

        self.auth(self.founder)
        self.assertEqual(self.client.get(f"/api/support-requests/{support_id}/").status_code, 404)

    def test_public_stats_and_health(self):
        self.assertEqual(self.client.get("/api/health/").status_code, 200)
        self.assertEqual(self.client.get("/api/stats/").data["investors"], 1)
