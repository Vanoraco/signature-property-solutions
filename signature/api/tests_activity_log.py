from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from signatureapp.models import ActivityLogEntry, catagory, facilities, propertys
from signature.request_state import current_user
from signatureapp.tests import _icon


User = get_user_model()


class ActivityLogApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='activity-admin',
            password='pw12345',
            is_staff=True,
            email='act@example.com',
        )
        self.category = catagory.objects.create(
            catagorys='Apartment', slug='apt', icon=_icon(),
        )
        self.facility = facilities.objects.create(
            facilities_name='Parking', slug='parking',
        )
        # DRF's force_authenticate bypasses middleware, so simulate the
        # middleware behavior by exposing the admin on the ContextVar.
        self._actor_token = current_user.set(self.admin)

    def tearDown(self):
        current_user.reset(self._actor_token)
        ActivityLogEntry.objects.all().delete()
        super().tearDown()

    def test_creating_a_property_logs_a_create_entry(self):
        self.client.force_authenticate(self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/properties/', {
                'property_title': 'Bole Garden',
                'slug': 'bole-garden',
                'property_types': self.category.id,
                'property_status': 'For Sale',
                'price': '8,500,000 ETB',
                'property_location': 'Bole',
                'property_size': 160,
                'property_area': 180,
                'property_floor': 1,
                'facilitie': [self.facility.id],
            }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        entry = ActivityLogEntry.objects.filter(
            action='create', target_model='Property', target_id=response.data['id'],
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.actor_username, 'activity-admin')
        self.assertEqual(entry.target_label, 'Bole Garden')
        self.assertIn('Bole Garden', entry.summary)

    def test_updating_a_property_logs_an_update_entry(self):
        property = propertys.objects.create(
            property_title='CMC House', slug='cmc-house',
            property_types=self.category, property_size=100,
            property_area=100, property_floor=1,
        )
        self.client.force_authenticate(self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(f'/api/properties/{property.id}/', {
                'property_title': 'CMC House Renovated',
            }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        entry = ActivityLogEntry.objects.filter(
            action='update', target_model='Property', target_id=property.id,
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.actor_username, 'activity-admin')

    def test_deleting_a_category_logs_a_delete_entry(self):
        cat = catagory.objects.create(
            catagorys='Office', slug='office-del', icon=_icon(),
        )
        self.client.force_authenticate(self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(f'/api/categories/{cat.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        entry = ActivityLogEntry.objects.filter(
            action='delete', target_model='Category', target_id=cat.id,
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.target_label, 'Office')

    def test_activity_endpoint_returns_entries_newest_first(self):
        # Seed two entries.
        with self.captureOnCommitCallbacks(execute=True):
            propertys.objects.create(
                property_title='Seed One', slug='seed-one',
                property_types=self.category, property_size=1, property_area=1, property_floor=1,
            )
            property_two = propertys.objects.create(
                property_title='Seed Two', slug='seed-two',
                property_types=self.category, property_size=1, property_area=1, property_floor=1,
            )
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/activity/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 2)
        # Newest first
        first_id = response.data['results'][0]['target_id']
        self.assertEqual(first_id, property_two.id)

    def test_activity_requires_auth(self):
        response = self.client.get('/api/activity/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_filter_by_action(self):
        with self.captureOnCommitCallbacks(execute=True):
            created = propertys.objects.create(
                property_title='Filter Me', slug='filter-me',
                property_types=self.category, property_size=1, property_area=1, property_floor=1,
            )
        self.client.force_authenticate(self.admin)
        # Update it
        with self.captureOnCommitCallbacks(execute=True):
            self.client.patch(f'/api/properties/{created.id}/', {'property_title': 'Filtered'})
        creates = self.client.get('/api/activity/?action=create')
        updates = self.client.get('/api/activity/?action=update')
        self.assertGreaterEqual(creates.data['count'], 1)
        self.assertGreaterEqual(updates.data['count'], 1)
        self.assertTrue(all(e['action'] == 'create' for e in creates.data['results']))
        self.assertTrue(all(e['action'] == 'update' for e in updates.data['results']))
