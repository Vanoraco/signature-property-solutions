import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from django.contrib.auth import get_user_model
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase


class MediaAssetApiTests(APITestCase):
    def setUp(self):
        self.storage_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.storage_directory.cleanup)
        self.storage_root = Path(self.storage_directory.name)
        self.media_root = self.storage_root / 'media'
        self.media_root.mkdir()
        self.media_override = self.settings(
            MEDIA_ROOT=self.media_root,
            MEDIA_URL='/images/',
        )
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.user = get_user_model().objects.create_user(
            username='media-assets-test',
            password='test-pass',
        )

    def create_image(self, relative_path, image_format='PNG', modified_at=None):
        path = self.media_root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.new('RGB', (2, 2), (120, 80, 40)).save(path, format=image_format)
        if modified_at is not None:
            os.utime(path, (modified_at, modified_at))
        return path

    def authenticate(self):
        self.client.force_authenticate(self.user)

    def test_list_returns_valid_images_newest_first(self):
        older_timestamp = datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp()
        newer_timestamp = datetime(2026, 1, 1, tzinfo=timezone.utc).timestamp()
        older = self.create_image('older.png', modified_at=older_timestamp)
        newer = self.create_image(
            'products/new image.jpg',
            image_format='JPEG',
            modified_at=newer_timestamp,
        )
        (self.media_root / 'notes.txt').write_text('not an image', encoding='utf-8')
        (self.media_root / 'disguised.jpg').write_text('not an image', encoding='utf-8')
        self.authenticate()

        response = self.client.get('/api/media-assets/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(
            [asset['path'] for asset in response.data['results']],
            ['products/new image.jpg', 'older.png'],
        )
        newest = response.data['results'][0]
        self.assertEqual(newest['name'], 'new image.jpg')
        self.assertEqual(newest['size'], newer.stat().st_size)
        self.assertEqual(newest['modified_at'], '2026-01-01T00:00:00+00:00')
        self.assertEqual(newest['url'], '/images/products/new%20image.jpg')
        self.assertEqual(response.data['results'][1]['size'], older.stat().st_size)

    def test_download_returns_the_selected_image(self):
        image_path = self.create_image('products/download me.png')
        expected_bytes = image_path.read_bytes()
        self.authenticate()

        response = self.client.get(
            '/api/media-assets/download/',
            {'path': 'products/download me.png'},
        )
        self.addCleanup(response.close)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertIn('download me.png', response['Content-Disposition'])
        self.assertEqual(b''.join(response.streaming_content), expected_bytes)

    def test_list_and_download_require_authentication(self):
        self.create_image('private.png')

        list_response = self.client.get('/api/media-assets/')
        download_response = self.client.get(
            '/api/media-assets/download/',
            {'path': 'private.png'},
        )

        self.assertEqual(list_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(download_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_download_rejects_unsafe_and_non_image_paths(self):
        outside_image = self.storage_root / 'outside.png'
        Image.new('RGB', (1, 1)).save(outside_image, format='PNG')
        (self.media_root / 'notes.txt').write_text('private text', encoding='utf-8')
        (self.media_root / 'disguised.jpg').write_text('private text', encoding='utf-8')
        truncated_image = self.create_image('truncated.jpg', image_format='JPEG')
        truncated_bytes = truncated_image.read_bytes()
        truncated_image.write_bytes(truncated_bytes[:len(truncated_bytes) // 2])
        self.authenticate()

        invalid_paths = [
            '../outside.png',
            '..\\outside.png',
            str(outside_image.resolve()),
            'notes.txt',
            'disguised.jpg',
            'truncated.jpg',
        ]
        for invalid_path in invalid_paths:
            with self.subTest(path=invalid_path):
                response = self.client.get(
                    '/api/media-assets/download/',
                    {'path': invalid_path},
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        missing_path_response = self.client.get('/api/media-assets/download/')
        missing_file_response = self.client.get(
            '/api/media-assets/download/',
            {'path': 'missing.png'},
        )
        self.assertEqual(missing_path_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(missing_file_response.status_code, status.HTTP_404_NOT_FOUND)
