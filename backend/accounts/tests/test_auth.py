from rest_framework.test import APITestCase

from accounts.models import InvestorProfile, User


class AuthTests(APITestCase):
    def test_register_login_and_me(self):
        response = self.client.post("/api/auth/register/", {
            "email": "Inv@Example.com", "password": "StrongPass123", "full_name": "Инвестор", "role": "investor",
        })
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["email"], "inv@example.com")
        self.assertTrue(InvestorProfile.objects.filter(user__email="inv@example.com").exists())

        login = self.client.post("/api/auth/login/", {"email": "inv@example.com", "password": "StrongPass123"})
        self.assertEqual(login.status_code, 200)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        me = self.client.patch("/api/auth/me/", {
            "telegram": "@inv", "investor_profile": {"industries": ["fintech"], "ticket_min": 1000, "ticket_max": 5000},
        }, format="json")
        self.assertEqual(me.status_code, 200, me.data)
        self.assertEqual(me.data["investor_profile"]["industries"], ["fintech"])

    def test_cannot_register_as_admin_or_duplicate(self):
        response = self.client.post("/api/auth/register/", {
            "email": "a@example.com", "password": "StrongPass123", "role": "admin",
        })
        self.assertEqual(response.status_code, 400)
        User.objects.create_user(email="b@example.com", password="StrongPass123")
        response = self.client.post("/api/auth/register/", {
            "email": "B@example.com", "password": "StrongPass123", "role": "founder",
        })
        self.assertEqual(response.status_code, 400)

    def test_weak_password_rejected(self):
        response = self.client.post("/api/auth/register/", {
            "email": "c@example.com", "password": "12345678", "role": "founder",
        })
        self.assertEqual(response.status_code, 400)

    def test_choices(self):
        response = self.client.get("/api/meta/choices/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["industries"])
