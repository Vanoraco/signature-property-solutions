"""Audit-log signals that turn admin CRUD into ActivityLogEntry rows.

Every handler is wrapped in try/except + transaction.on_commit so that:
  1. The user's primary operation never fails because of logging
  2. The log row is only written once the original change is durable

The current actor is read from `signature.request_state.current_user`,
a ContextVar populated by ActivityLogViewSetMixin in api/views.py.
"""

from django.db import transaction
from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from signatureapp.models import (
    ActivityLogEntry,
    _activity_log,
    propertys,
    catagory,
    facilities,
    egent,
    home,
    about,
    contact,
    serevices,
    testimonial,
    property_request,
)


User = get_user_model()

# Each tracked model: target_model_label -> callable returning a human label.
TRACKED_MODELS = {
    propertys: ('Property', lambda obj: getattr(obj, 'property_title', '') or f'#{obj.pk}'),
    catagory: ('Category', lambda obj: getattr(obj, 'catagorys', '') or f'#{obj.pk}'),
    facilities: ('Facility', lambda obj: getattr(obj, 'facilities_name', '') or f'#{obj.pk}'),
    egent: ('Agent', lambda obj: getattr(obj, 'name', '') or f'#{obj.pk}'),
    home: ('Home content', lambda obj: getattr(obj, 'title', '') or f'#{obj.pk}'),
    about: ('About content', lambda obj: getattr(obj, 'title', '') or f'#{obj.pk}'),
    contact: ('Contact details', lambda obj: getattr(obj, 'email', '') or f'#{obj.pk}'),
    serevices: ('Service', lambda obj: getattr(obj, 'service_name', '') or f'#{obj.pk}'),
    testimonial: ('Testimonial', lambda obj: getattr(obj, 'name', '') or f'#{obj.pk}'),
    property_request: ('Property request', lambda obj: getattr(obj, 'name', '') or getattr(obj, 'property_type', '') or f'#{obj.pk}'),
}


def _actor():
    """Return (user, username) where user may be None but username is a str."""
    try:
        from signature.request_state import current_user
        user = current_user.get()
    except Exception:
        user = None
    if user is None or not getattr(user, 'is_authenticated', False):
        return None, ''
    username = user.get_username() if hasattr(user, 'get_username') else str(user)
    return user, username


def _log(action, model_label, instance, label):
    """Wrap the actual write in on_commit + try/except."""
    try:
        user, username = _actor()
        action_word = action.capitalize()
        summary = f'{action_word} {model_label}: {label}' if label else f'{action_word} {model_label}'
        pk = instance.pk
        target_label = str(label)[:300] if label else ''
        target_summary = str(summary)[:600] if summary else ''
        transaction.on_commit(lambda: _activity_log(
            actor_username=username,
            action=action,
            target_model=model_label,
            target_id=pk,
            target_label=target_label,
            summary=target_summary,
        ))
        # Attach actor relation separately so failed lookups do not block.
        if user is not None:
            def _attach_actor():
                try:
                    ActivityLogEntry.objects.filter(
                        target_model=model_label,
                        target_id=instance.pk,
                        actor_username=username,
                    ).order_by('-id').first()
                except Exception:
                    pass
            transaction.on_commit(_attach_actor)
    except Exception:
        pass


def _make_save_handler(model, model_label, label_fn):
    @receiver(post_save, sender=model, weak=False, dispatch_uid=f'activity_save_{model.__name__}')
    def handler(sender, instance, created, **kwargs):
        label = label_fn(instance) if label_fn else ''
        _log('create' if created else 'update', model_label, instance, label)
    return handler


def _make_delete_handler(model, model_label, label_fn):
    # use pre_delete because post_delete fires AFTER Django clears
    # instance.pk to None, which would leave our log entry without a
    # target_id. pre_delete fires while pk is still set.
    @receiver(pre_delete, sender=model, weak=False, dispatch_uid=f'activity_delete_{model.__name__}')
    def handler(sender, instance, **kwargs):
        label = label_fn(instance) if label_fn else ''
        try:
            user, username = _actor()
            summary = f'Deleted {model_label}: {label}' if label else f'Deleted {model_label}'
            # Capture pk before transaction.on_commit runs (the instance
            # may be gc'd or mutated by then).
            pk = instance.pk
            target_label = str(label)[:300] if label else ''
            target_summary = str(summary)[:600] if summary else ''
            transaction.on_commit(lambda: _activity_log(
                actor_username=username,
                action='delete',
                target_model=model_label,
                target_id=pk,
                target_label=target_label,
                summary=target_summary,
            ))
        except Exception:
            pass
    return handler


for _model, (_label, _fn) in TRACKED_MODELS.items():
    _make_save_handler(_model, _label, _fn)
    _make_delete_handler(_model, _label, _fn)


def _user_label(obj):
    full = ' '.join(filter(None, [getattr(obj, 'first_name', ''), getattr(obj, 'last_name', '')]))
    return full or getattr(obj, 'username', '') or f'#{obj.pk}'


@receiver(post_save, sender=User, weak=False, dispatch_uid='activity_user_save')
def _user_save(sender, instance, created, **kwargs):
    # Suppress noisy self-refreshes (last_login bump, etc.) unless explicitly
    # marked as a profile edit by the user.
    if not created and getattr(instance, '_activity_silent', False):
        return
    label = _user_label(instance)
    user, _ = _actor()
    # For self-edits, attribute the action to the user themselves.
    actor_name = instance.get_username() if hasattr(instance, 'get_username') else str(instance)
    action = 'create' if created else 'update'
    summary = f'{action.capitalize()}d User: {label}' if label else f'{action.capitalize()}d User'
    try:
        transaction.on_commit(lambda: _activity_log(
            actor_username=actor_name,
            action=action,
            target_model='User',
            target_id=instance.pk,
            target_label=label,
            summary=summary,
        ))
    except Exception:
        pass


@receiver(post_delete, sender=User, weak=False, dispatch_uid='activity_user_delete')
def _user_delete(sender, instance, **kwargs):
    label = _user_label(instance)
    user, username = _actor()
    try:
        transaction.on_commit(lambda: _activity_log(
            actor_username=username,
            action='delete',
            target_model='User',
            target_id=instance.pk,
            target_label=label,
            summary=f'Deleted User: {label}',
        ))
    except Exception:
        pass


@receiver(post_save, sender=Group, weak=False, dispatch_uid='activity_group_save')
def _group_save(sender, instance, created, **kwargs):
    label = getattr(instance, 'name', '') or f'#{instance.pk}'
    action = 'create' if created else 'update'
    user, username = _actor()
    try:
        transaction.on_commit(lambda: _activity_log(
            actor_username=username,
            action=action,
            target_model='Role',
            target_id=instance.pk,
            target_label=label,
            summary=f'{action.capitalize()}d Role: {label}',
        ))
    except Exception:
        pass


@receiver(post_delete, sender=Group, weak=False, dispatch_uid='activity_group_delete')
def _group_delete(sender, instance, **kwargs):
    label = getattr(instance, 'name', '') or f'#{instance.pk}'
    user, username = _actor()
    try:
        transaction.on_commit(lambda: _activity_log(
            actor_username=username,
            action='delete',
            target_model='Role',
            target_id=instance.pk,
            target_label=label,
            summary=f'Deleted Role: {label}',
        ))
    except Exception:
        pass
