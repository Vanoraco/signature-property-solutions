"""Thread-safe ContextVar holding the current request user.

Set by ActivityLogViewSetMixin in api/views.py so audit-log signals can
attribute actions to the authenticated admin user without threading the
request through every model save.
"""

from contextvars import ContextVar
from typing import Optional

current_user: ContextVar[Optional[object]] = ContextVar('current_user', default=None)
