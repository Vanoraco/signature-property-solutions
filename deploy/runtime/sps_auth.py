"""Production authentication policy kept stable across code rollbacks."""

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class StaffJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not user.is_staff:
            raise AuthenticationFailed('Staff access is required.', code='not_staff')
        return user
