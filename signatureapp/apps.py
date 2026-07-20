from django.apps import AppConfig


class SignatureappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'signatureapp'

    def ready(self):
        # Import signals so the audit-log receivers are registered.
        from . import signals  # noqa: F401
