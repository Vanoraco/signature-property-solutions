import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.db.models.deletion import ProtectedError
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from signatureapp.models import catagory, egent, facilities, propertys


def image_file(name='lookup.png'):
    image_data = BytesIO()
    Image.new('RGBA', (1, 1), (0, 0, 0, 0)).save(image_data, format='PNG')
    return SimpleUploadedFile(name, image_data.getvalue(), content_type='image/png')


class LookupCrudApiTests(APITestCase):
    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        self.media_override = self.settings(MEDIA_ROOT=self.media_directory.name)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)

        self.user = get_user_model().objects.create_user(
            username='lookup-crud-test',
            password='test-pass',
        )
        self.client.force_authenticate(self.user)

    def create_property(self, category, agent=None, facility=None, slug='lookup-property'):
        created = propertys.objects.create(
            property_title='Lookup CRUD Property',
            slug=slug,
            property_types=category,
            agent=agent,
            property_size=100,
            property_area=120,
            property_floor=1,
        )
        if facility:
            created.facilitie.add(facility)
        return created

    def test_lookup_detail_responses_include_property_usage_counts(self):
        category = catagory.objects.create(
            catagorys='Apartment',
            slug='count-apartment',
            icon=image_file('category-count.png'),
        )
        facility = facilities.objects.create(
            facilities_name='Parking',
            slug='count-parking',
        )
        agent = egent.objects.create(name='Count Agent')
        self.create_property(category, agent=agent, facility=facility)

        category_response = self.client.get(f'/api/categories/{category.id}/')
        facility_response = self.client.get(f'/api/facilities/{facility.id}/')
        agent_response = self.client.get(f'/api/agents/{agent.id}/')

        self.assertEqual(category_response.status_code, status.HTTP_200_OK)
        self.assertEqual(category_response.data['property_count'], 1)
        self.assertEqual(facility_response.status_code, status.HTTP_200_OK)
        self.assertEqual(facility_response.data['property_count'], 1)
        self.assertEqual(agent_response.status_code, status.HTTP_200_OK)
        self.assertEqual(agent_response.data['listing_count'], 1)

    def test_lookup_lists_use_a_fixed_number_of_count_queries(self):
        for index in range(3):
            catagory.objects.create(
                catagorys=f'Category {index}',
                slug=f'query-category-{index}',
                icon=image_file(f'query-category-{index}.png'),
            )
            facilities.objects.create(
                facilities_name=f'Facility {index}',
                slug=f'query-facility-{index}',
            )
            egent.objects.create(name=f'Agent {index}')

        with self.assertNumQueries(2):
            category_response = self.client.get('/api/categories/')
        with self.assertNumQueries(2):
            facility_response = self.client.get('/api/facilities/')
        with self.assertNumQueries(2):
            agent_response = self.client.get('/api/agents/')

        self.assertEqual(category_response.status_code, status.HTTP_200_OK)
        self.assertEqual(facility_response.status_code, status.HTTP_200_OK)
        self.assertEqual(agent_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [record['id'] for record in category_response.data['results']],
            sorted(record['id'] for record in category_response.data['results']),
        )
        self.assertEqual(
            [record['id'] for record in facility_response.data['results']],
            sorted(record['id'] for record in facility_response.data['results']),
        )
        self.assertEqual(
            [record['id'] for record in agent_response.data['results']],
            sorted(record['id'] for record in agent_response.data['results']),
        )

    def test_property_detail_uses_annotated_facility_counts(self):
        category = catagory.objects.create(
            catagorys='Detail Category',
            slug='detail-category',
            icon=image_file('detail-category.png'),
        )
        shared_facility = facilities.objects.create(
            facilities_name='Shared Pool',
            slug='shared-pool',
        )
        first_property = self.create_property(
            category,
            facility=shared_facility,
            slug='first-detail-property',
        )
        self.create_property(
            category,
            facility=shared_facility,
            slug='second-detail-property',
        )

        with self.assertNumQueries(2):
            response = self.client.get(f'/api/properties/{first_property.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['facilitie_detail']), 1)
        self.assertEqual(response.data['facilitie_detail'][0]['property_count'], 2)

    def test_category_crud_supports_multipart_icon_upload(self):
        create_response = self.client.post(
            '/api/categories/',
            {
                'catagorys': 'Townhouse',
                'slug': 'crud-townhouse',
                'icon': image_file('category-create.png'),
            },
            format='multipart',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED, create_response.data)
        category = catagory.objects.get(pk=create_response.data['id'])
        self.assertTrue(category.icon.name)

        update_response = self.client.patch(
            f'/api/categories/{category.id}/',
            {'catagorys': 'Updated Townhouse'},
            format='multipart',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK, update_response.data)
        category.refresh_from_db()
        self.assertEqual(category.catagorys, 'Updated Townhouse')

        delete_response = self.client.delete(f'/api/categories/{category.id}/')
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(catagory.objects.filter(pk=category.id).exists())

    def test_facility_crud(self):
        create_response = self.client.post(
            '/api/facilities/',
            {'facilities_name': 'Rooftop Terrace', 'slug': 'crud-rooftop-terrace'},
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED, create_response.data)
        facility_id = create_response.data['id']
        update_response = self.client.patch(
            f'/api/facilities/{facility_id}/',
            {'facilities_name': 'Private Rooftop Terrace'},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK, update_response.data)
        self.assertEqual(update_response.data['facilities_name'], 'Private Rooftop Terrace')

        delete_response = self.client.delete(f'/api/facilities/{facility_id}/')
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(facilities.objects.filter(pk=facility_id).exists())

    def test_referenced_facility_deletion_preserves_property(self):
        category = catagory.objects.create(
            catagorys='Facility Category',
            slug='facility-category',
            icon=image_file('facility-category.png'),
        )
        facility = facilities.objects.create(
            facilities_name='Shared Gym',
            slug='shared-gym',
        )
        linked_property = self.create_property(
            category,
            facility=facility,
            slug='facility-linked-property',
        )

        response = self.client.delete(f'/api/facilities/{facility.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(facilities.objects.filter(pk=facility.id).exists())
        self.assertTrue(propertys.objects.filter(pk=linked_property.id).exists())
        linked_property.refresh_from_db()
        self.assertFalse(linked_property.facilitie.exists())

    def test_agent_crud_supports_multipart_image_upload(self):
        create_response = self.client.post(
            '/api/agents/',
            {
                'name': 'Lookup Agent',
                'image': image_file('agent-create.png'),
                'phone_number': '+251900000000',
                'office_phone': '+251110000000',
                'email': 'lookup@example.com',
                'facebook': 'https://example.com/facebook',
                'instagram': 'https://example.com/instagram',
                'linkden': 'https://example.com/linkedin',
            },
            format='multipart',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED, create_response.data)
        agent = egent.objects.get(pk=create_response.data['id'])
        self.assertTrue(agent.image.name)

        update_response = self.client.patch(
            f'/api/agents/{agent.id}/',
            {'name': 'Updated Lookup Agent'},
            format='multipart',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK, update_response.data)
        agent.refresh_from_db()
        self.assertEqual(agent.name, 'Updated Lookup Agent')

        delete_response = self.client.delete(f'/api/agents/{agent.id}/')
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(egent.objects.filter(pk=agent.id).exists())

    def test_referenced_category_cannot_be_deleted(self):
        category = catagory.objects.create(
            catagorys='Protected Category',
            slug='protected-category',
            icon=image_file('protected-category.png'),
        )
        linked_property = self.create_property(category, slug='category-protected-property')

        response = self.client.delete(f'/api/categories/{category.id}/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['property_count'], 1)
        self.assertEqual(
            str(response.data['detail']),
            'Cannot delete this category because it is used by 1 property.',
        )
        self.assertTrue(catagory.objects.filter(pk=category.id).exists())
        self.assertTrue(propertys.objects.filter(pk=linked_property.id).exists())

    def test_referenced_agent_cannot_be_deleted(self):
        category = catagory.objects.create(
            catagorys='Agent Category',
            slug='agent-category',
            icon=image_file('agent-category.png'),
        )
        agent = egent.objects.create(name='Protected Agent')
        linked_property = self.create_property(
            category,
            agent=agent,
            slug='agent-protected-property',
        )

        response = self.client.delete(f'/api/agents/{agent.id}/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['property_count'], 1)
        self.assertEqual(
            str(response.data['detail']),
            'Cannot delete this agent because it is used by 1 property.',
        )
        self.assertTrue(egent.objects.filter(pk=agent.id).exists())
        self.assertTrue(propertys.objects.filter(pk=linked_property.id).exists())

    def test_model_relationships_protect_referenced_categories_and_agents(self):
        category = catagory.objects.create(
            catagorys='Model Protected Category',
            slug='model-protected-category',
            icon=image_file('model-protected-category.png'),
        )
        agent = egent.objects.create(name='Model Protected Agent')
        linked_property = self.create_property(
            category,
            agent=agent,
            slug='model-protected-property',
        )

        with self.assertRaises(ProtectedError):
            category.delete()
        with self.assertRaises(ProtectedError):
            agent.delete()

        self.assertTrue(propertys.objects.filter(pk=linked_property.id).exists())
