import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from signatureapp.models import home


def logo_file():
    data = BytesIO()
    Image.new('RGBA', (16, 8), (201, 168, 76, 255)).save(data, format='PNG')
    return SimpleUploadedFile('logo.png', data.getvalue(), content_type='image/png')


class HomeLogoApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='logo-admin',
            password='test-password',
            is_staff=True,
        )
        self.client.force_authenticate(self.user)
        self.record = home.objects.create(slogon='Find home', title='Signature')

    def test_admin_can_upload_logo_through_home_endpoint(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.patch(
                f'/api/home/{self.record.pk}/',
                {'logo': logo_file()},
                format='multipart',
            )

            self.assertEqual(response.status_code, 200)
            self.record.refresh_from_db()
            self.assertTrue(self.record.logo.name.startswith('site-logo/'))
            self.assertTrue(response.data['logo'].startswith('/images/site-logo/'))
