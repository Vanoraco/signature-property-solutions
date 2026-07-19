from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class UserApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='users-admin',
            password='pw12345',
            is_staff=True,
            email='admin@example.com',
        )
        self.regular = User.objects.create_user(
            username='regular-user',
            password='pw12345',
            is_staff=False,
            email='regular@example.com',
        )
        self.editors_group = Group.objects.create(name='Editors')
        self.admin.groups.add(self.editors_group)
        self.client.force_authenticate(self.admin)

    def test_list_returns_only_staff_users(self):
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in response.data['results']]
        self.assertIn('users-admin', usernames)
        self.assertNotIn('regular-user', usernames)

    def test_create_user_sets_password_and_groups(self):
        response = self.client.post('/api/users/', {
            'username': 'new-editor',
            'email': 'new@example.com',
            'password': 'pw12345',
            'is_staff': True,
            'is_active': True,
            'is_superuser': False,
            'groups': [self.editors_group.id],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        created = User.objects.get(username='new-editor')
        self.assertTrue(created.check_password('pw12345'))
        self.assertTrue(created.is_staff)
        self.assertIn(self.editors_group, created.groups.all())

    def test_patch_can_reset_password_without_clearing_groups(self):
        target = User.objects.create_user(
            username='patch-target', password='oldpw', is_staff=True,
        )
        target.groups.add(self.editors_group)
        response = self.client.patch(f'/api/users/{target.id}/', {
            'password': 'newpw',
            'groups': [self.editors_group.id],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        target.refresh_from_db()
        self.assertTrue(target.check_password('newpw'))
        self.assertIn(self.editors_group, target.groups.all())

    def test_user_cannot_delete_self(self):
        response = self.client.delete(f'/api/users/{self.admin.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(id=self.admin.id).exists())

    def test_can_delete_another_user(self):
        target = User.objects.create_user(
            username='doomed', password='pw', is_staff=True,
        )
        response = self.client.delete(f'/api/users/{target.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=target.id).exists())


class GroupApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='groups-admin', password='pw', is_staff=True,
        )
        self.group = Group.objects.create(name='Managers')
        User.objects.create_user(
            username='member1', password='pw', is_staff=True,
        ).groups.add(self.group)
        User.objects.create_user(
            username='member2', password='pw', is_staff=True,
        ).groups.add(self.group)
        self.client.force_authenticate(self.admin)

    def test_list_includes_member_count(self):
        response = self.client.get('/api/groups/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_name = {g['name']: g for g in response.data['results']}
        self.assertEqual(by_name['Managers']['user_count'], 2)

    def test_can_create_and_rename_group(self):
        created = self.client.post('/api/groups/', {'name': 'Reviewers'}, format='json')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        group_id = created.data['id']
        renamed = self.client.patch(f'/api/groups/{group_id}/', {'name': 'Auditors'}, format='json')
        self.assertEqual(renamed.status_code, status.HTTP_200_OK)
        self.assertEqual(renamed.data['name'], 'Auditors')
