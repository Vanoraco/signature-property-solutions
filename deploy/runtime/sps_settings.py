"""Deployment-owned settings that keep runtime state outside the Git checkout.

This module intentionally wraps the versioned Django settings. It also keeps
the first rollback compatible with pre-deployment commits whose settings used
repository-local SQLite and media paths.
"""

import os
from pathlib import Path

from signature.settings import *  # noqa: F403,F401


def _env_list(name, default=()):
    value = os.getenv(name)
    if value is None:
        return list(default)
    return [item.strip() for item in value.split(',') if item.strip()]


SECRET_KEY = os.environ['SECRET_KEY']
DEBUG = os.getenv('DEBUG', 'False').strip().lower() in {'1', 'true', 'yes', 'on'}

SITE_NAME = os.getenv('SITE_NAME', 'Signature Property Solutions')
SITE_URL = os.getenv('SITE_URL', 'https://signaturepropertysolutions.com').rstrip('/')
ADMIN_URL = os.getenv('ADMIN_URL', 'admin/')

ALLOWED_HOSTS = _env_list('ALLOWED_HOSTS', [
    'signaturepropertysolutions.com',
    'www.signaturepropertysolutions.com',
    'admin.signaturepropertysolutions.com',
    '127.0.0.1',
    'localhost',
])
CSRF_TRUSTED_ORIGINS = _env_list('CSRF_TRUSTED_ORIGINS', [
    SITE_URL,
    'https://admin.signaturepropertysolutions.com',
])
CORS_ALLOWED_ORIGINS = _env_list('CORS_ALLOWED_ORIGINS', [
    SITE_URL,
    'https://admin.signaturepropertysolutions.com',
])
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    'DEFAULT_AUTHENTICATION_CLASSES': ('sps_auth.StaffJWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAdminUser',),
}


def staff_user_authentication_rule(user):
    return bool(user and user.is_active and user.is_staff)


SIMPLE_JWT = {  # noqa: F405
    **SIMPLE_JWT,  # noqa: F405
    'USER_AUTHENTICATION_RULE': 'sps_settings.staff_user_authentication_rule',
}

DATABASES = {  # noqa: F405
    **DATABASES,  # noqa: F405
    'default': {
        **DATABASES['default'],  # noqa: F405
        'NAME': Path(os.environ['DATABASE_PATH']),
    },
}
MEDIA_ROOT = Path(os.environ['MEDIA_ROOT'])
STATIC_ROOT = Path(os.environ['STATIC_ROOT'])

SECURE_SSL_REDIRECT = not DEBUG
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True
