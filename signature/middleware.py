"""Middleware that exposes the current request user to audit-log signals.

Stores the authenticated user on `signature.request_state.current_user`
so model-level post_save / post_delete receivers in signatureapp/signals.py
can attribute the action to the admin user without having to thread the
request through every serializer / manager / signal.
"""

from signature.request_state import current_user


class ActivityLogUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = None
        user = getattr(request, 'user', None)
        if user is not None and getattr(user, 'is_authenticated', False):
            token = current_user.set(user)
        try:
            response = self.get_response(request)
        finally:
            if token is not None:
                current_user.reset(token)
        return response
