from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from signatureapp.models import property_request, SearchEvent


class AnalyticsApiTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(
            username='analytics-admin',
            password='strong-test-password',
            is_staff=True,
        )
        property_request.objects.create(name='Buyer', email='buyer@example.com', goal='Buy', message='hi', status='new')
        property_request.objects.create(name='Renter', email='renter@example.com', goal='Rent', message='hi', status='called')
        SearchEvent.objects.create(query='3 bedroom apartment', location_filter='Bole', results_count=8)
        SearchEvent.objects.create(query='3 bedroom apartment', location_filter='Bole', results_count=2)
        SearchEvent.objects.create(query='penthouse for rent', location_filter='Cmc', results_count=3)

    def test_requires_authentication(self):
        response = self.client.get('/api/analytics/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rejects_non_staff(self):
        User = get_user_model()
        plain = User.objects.create_user(
            username='plain-user',
            password='strong-test-password',
        )
        self.client.force_authenticate(plain)
        response = self.client.get('/api/analytics/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_aggregates_real_requests_and_searches(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/analytics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(len(data['weeks']), 8)
        self.assertEqual(sum(entry['count'] for entry in data['weeks']), 2)

        by_status = {entry['label']: entry['count'] for entry in data['by_status']}
        self.assertEqual(by_status.get('New'), 1)
        self.assertEqual(by_status.get('Called'), 1)

        by_goal = {entry['label']: entry['count'] for entry in data['by_goal']}
        self.assertEqual(by_goal.get('Buy'), 1)
        self.assertEqual(by_goal.get('Rent'), 1)

        top = {entry['term']: entry['count'] for entry in data['top_terms']}
        self.assertEqual(top.get('3 bedroom apartment'), 2)
        self.assertEqual(top.get('penthouse for rent'), 1)