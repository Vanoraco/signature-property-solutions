from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class AdminAuthenticationTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.staff_user = user_model.objects.create_user(
            username='staff-admin',
            password='strong-test-password',
            is_staff=True,
        )
        self.regular_user = user_model.objects.create_user(
            username='regular-user',
            password='strong-test-password',
        )

    def test_staff_user_can_log_in(self):
        response = self.client.post('/api/auth/login/', {
            'username': self.staff_user.username,
            'password': 'strong-test-password',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['user']['is_staff'])
        self.assertIn('access', response.data)

    def test_regular_user_cannot_log_in_or_access_admin_api(self):
        login_response = self.client.post('/api/auth/login/', {
            'username': self.regular_user.username,
            'password': 'strong-test-password',
        })
        self.client.force_authenticate(self.regular_user)
        api_response = self.client.get('/api/properties/')

        self.assertEqual(login_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(api_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_readiness_endpoint_is_public_and_checks_database(self):
        response = self.client.get('/api/health/ready/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'status': 'ok'})
