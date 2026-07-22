import os
import warnings
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db import connection
from django.db import transaction
from django.db.models import Count, IntegerField, OuterRef, Prefetch, Subquery, Value
from django.db.models.functions import Coalesce
from django.http import FileResponse
from PIL import Image, UnidentifiedImageError
from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import AuthenticationFailed, NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from signatureapp.models import (
    home, catagory, facilities, egent, propertys,
    about, serevices, contact, testimonial, property_request,
    ActivityLogEntry, SearchEvent,
    servicespage, servicespage_why_item, servicespage_process_step,
)
from .serializers import (
    HomeSerializer, CategorySerializer, FacilitySerializer,
    AgentSerializer, PropertyListSerializer, PropertyDetailSerializer,
    AboutSerializer, ServiceSerializer, ContactSerializer,
    TestimonialSerializer, PropertyRequestSerializer, PropertyRequestListSerializer,
    UserSerializer, GroupSerializer, ActivityLogEntrySerializer, SearchEventSerializer,
    ServicesPageSerializer,
)


SUPPORTED_MEDIA_IMAGE_FORMATS = {
    '.bmp': 'BMP',
    '.gif': 'GIF',
    '.jpeg': 'JPEG',
    '.jpg': 'JPEG',
    '.png': 'PNG',
    '.tif': 'TIFF',
    '.tiff': 'TIFF',
    '.webp': 'WEBP',
}
# Video formats are validated by extension only (no pixel decode like images),
# so the listing cost is a stat() per file and is safe for large libraries.
SUPPORTED_MEDIA_VIDEO_FORMATS = {
    '.mp4': 'MP4',
    '.webm': 'WEBM',
    '.mov': 'QuickTime',
    '.ogg': 'OGG',
    '.ogv': 'OGG',
}
MAX_MEDIA_IMAGE_PIXELS = 40_000_000


def _media_root():
    return Path(settings.MEDIA_ROOT).resolve()


def _is_within_media_root(path, media_root):
    try:
        path.relative_to(media_root)
    except ValueError:
        return False
    return True


def _verified_image_format(path, file_handle=None):
    expected_format = SUPPORTED_MEDIA_IMAGE_FORMATS.get(path.suffix.lower())
    if not expected_format:
        return None

    should_close = file_handle is None
    handle = file_handle or path.open('rb')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(handle) as image:
                detected_format = image.format
                width, height = image.size
                if width <= 0 or height <= 0 or width * height > MAX_MEDIA_IMAGE_PIXELS:
                    return None
                image.verify()

            handle.seek(0)
            with Image.open(handle) as image:
                image.load()
        return detected_format if detected_format == expected_format else None
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        OSError,
        SyntaxError,
        UnidentifiedImageError,
        ValueError,
    ):
        return None
    finally:
        if should_close:
            handle.close()


def _inspected_image_format(path):
    expected_format = SUPPORTED_MEDIA_IMAGE_FORMATS.get(path.suffix.lower())
    if not expected_format:
        return None

    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(path) as image:
                detected_format = image.format
                width, height = image.size
                if width <= 0 or height <= 0 or width * height > MAX_MEDIA_IMAGE_PIXELS:
                    return None
        return detected_format if detected_format == expected_format else None
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        OSError,
        SyntaxError,
        UnidentifiedImageError,
        ValueError,
    ):
        return None


def _media_asset_url(relative_path):
    media_url = settings.MEDIA_URL.rstrip('/') + '/'
    return media_url + quote(relative_path, safe='/')


def _media_asset_record(path, media_root, kinds=frozenset({'image'})):
    try:
        resolved_path = path.resolve(strict=True)
        if not resolved_path.is_file() or not _is_within_media_root(resolved_path, media_root):
            return None
        suffix = resolved_path.suffix.lower()
        is_image = suffix in SUPPORTED_MEDIA_IMAGE_FORMATS
        is_video = suffix in SUPPORTED_MEDIA_VIDEO_FORMATS
        if is_image and 'image' not in kinds:
            is_image = False
        if is_video and 'video' not in kinds:
            is_video = False
        if not is_image and not is_video:
            return None
        if is_image:
            # Existing contract: only list images PIL can actually decode so
            # disguised.jpg and truncated files are excluded.
            if not _inspected_image_format(resolved_path):
                return None
        stat = resolved_path.stat()
        relative_path = resolved_path.relative_to(media_root).as_posix()
    except (OSError, RuntimeError, ValueError):
        return None

    return {
        'path': relative_path,
        'name': resolved_path.name,
        'url': _media_asset_url(relative_path),
        'size': stat.st_size,
        'modified_at': datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        'kind': 'video' if is_video else 'image',
        '_modified_timestamp': stat.st_mtime,
    }


def _resolve_media_asset_path(raw_path):
    if not raw_path or not isinstance(raw_path, str) or '\x00' in raw_path:
        raise ValidationError({'path': 'A media path is required.'})

    normalized_path = raw_path.replace('\\', '/')
    raw_parts = normalized_path.split('/')
    relative_path = PurePosixPath(normalized_path)
    if (
        relative_path.is_absolute()
        or any(part in {'', '.', '..'} or ':' in part for part in raw_parts)
    ):
        raise ValidationError({'path': 'Invalid media path.'})

    media_root = _media_root()
    try:
        resolved_path = media_root.joinpath(*relative_path.parts).resolve(strict=True)
    except FileNotFoundError as error:
        raise NotFound('Media asset not found.') from error
    except (OSError, RuntimeError, ValueError) as error:
        raise ValidationError({'path': 'Invalid media path.'}) from error

    if not resolved_path.is_file() or not _is_within_media_root(resolved_path, media_root):
        raise ValidationError({'path': 'Invalid media path.'})
    suffix = resolved_path.suffix.lower()
    if suffix not in SUPPORTED_MEDIA_IMAGE_FORMATS and suffix not in SUPPORTED_MEDIA_VIDEO_FORMATS:
        raise ValidationError({'path': 'Only supported image or video files can be downloaded.'})
    return resolved_path


@api_view(['GET'])
@permission_classes([IsAdminUser])
def media_asset_list(request):
    media_root = _media_root()
    # kind=image (default) preserves the original image-only contract.
    # kind=video lists video files. kind=all lists both. Any other value
    # falls back to image-only so existing callers are unaffected.
    raw_kind = (request.query_params.get('kind') or 'image').strip().lower()
    if raw_kind == 'video':
        kinds = frozenset({'video'})
    elif raw_kind == 'all':
        kinds = frozenset({'image', 'video'})
    else:
        kinds = frozenset({'image'})
    assets = []
    if media_root.is_dir():
        for directory, _, filenames in os.walk(media_root, followlinks=False):
            for filename in filenames:
                record = _media_asset_record(Path(directory, filename), media_root, kinds)
                if record:
                    assets.append(record)

    assets.sort(key=lambda asset: (-asset['_modified_timestamp'], asset['path'].lower()))
    for asset in assets:
        asset.pop('_modified_timestamp')
    return Response({'count': len(assets), 'results': assets})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def media_asset_download(request):
    resolved_path = _resolve_media_asset_path(request.query_params.get('path'))
    file_handle = resolved_path.open('rb')
    suffix = resolved_path.suffix.lower()
    if suffix in SUPPORTED_MEDIA_VIDEO_FORMATS:
        # Videos are streamed without pixel-level verification (PIL does not
        # decode video); we only check the file is readable.
        try:
            file_handle.seek(0, os.SEEK_END)
            file_handle.seek(0)
        except OSError:
            file_handle.close()
            raise ValidationError({'path': 'The selected video could not be read.'})
        content_type = 'video/mp4' if suffix == '.mp4' else f'video/{suffix.lstrip(".")}'
        return FileResponse(
            file_handle,
            as_attachment=True,
            filename=resolved_path.name,
            content_type=content_type,
        )

    image_format = _verified_image_format(resolved_path, file_handle=file_handle)
    if not image_format:
        file_handle.close()
        raise ValidationError({'path': 'The selected file is not a valid supported image.'})

    file_handle.seek(0)
    return FileResponse(
        file_handle,
        as_attachment=True,
        filename=resolved_path.name,
        content_type=Image.MIME.get(image_format, 'application/octet-stream'),
    )


def property_usage_count(relation):
    counts = propertys.objects.filter(
        **{relation: OuterRef('pk')}
    ).order_by().values(relation).annotate(
        total=Count('pk'),
    ).values('total')[:1]
    return Coalesce(
        Subquery(counts, output_field=IntegerField()),
        Value(0),
    )


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_staff:
            raise AuthenticationFailed('Administrator access is required.')
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'is_staff': self.user.is_staff,
            'is_superuser': self.user.is_superuser,
        }
        return data


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'admin_login'


@api_view(['GET'])
@permission_classes([AllowAny])
def health_ready(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except Exception:
        return Response({'status': 'unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def user_me(request):
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    })


class HomeViewSet(viewsets.ModelViewSet):
    queryset = home.objects.all()
    serializer_class = HomeSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.all().order_by('-id')
    serializer_class = UserSerializer
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'date_joined', 'id']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Only staff accounts are managed through the admin dashboard.
        return queryset.filter(is_staff=True)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.pk == request.user.pk:
            return Response(
                {'detail': 'You cannot delete your own account while signed in.',
                 'property_count': 0},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all().order_by('name')
    serializer_class = GroupSerializer
    search_fields = ['name']
    ordering_fields = ['name', 'id']


class ActivityLogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLogEntry.objects.select_related('actor').all().order_by('-created_at')
    serializer_class = ActivityLogEntrySerializer
    filterset_fields = ['action', 'target_model', 'actor_username']
    ordering_fields = ['created_at', 'id', 'action', 'target_model']
    search_fields = ['actor_username', 'target_label', 'summary', 'target_model']

    def get_queryset(self):
        queryset = super().get_queryset()
        for field in ('action', 'target_model', 'actor_username'):
            value = self.request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{f'{field}__iexact': value})
        target_id = self.request.query_params.get('target_id')
        if target_id and target_id.isdigit():
            queryset = queryset.filter(target_id=int(target_id))
        return queryset


class SearchEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SearchEvent.objects.all().order_by('-created_at')
    serializer_class = SearchEventSerializer
    search_fields = ['query', 'location_filter', 'property_type', 'status_filter']
    ordering_fields = ['created_at', 'results_count', 'id']
    filterset_fields = ['source', 'status_filter', 'property_type']

    def get_queryset(self):
        queryset = super().get_queryset()
        for field in ('source', 'status_filter', 'property_type'):
            value = self.request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{f'{field}__iexact': value})
        return queryset


@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_permissions(request):
    """Return the catalog of assignable permissions for the Roles editor.

    Restricted to app-level permissions (signatureapp) plus User management
    so the UI never offers internal Django permissions like LogEntry.
    """
    from django.contrib.contenttypes.models import ContentType
    app_labels = ['signatureapp', 'auth']
    content_types = ContentType.objects.filter(app_label__in=app_labels)
    permissions = Permission.objects.filter(content_type__in=content_types).select_related('content_type')
    return Response({
        'count': permissions.count(),
        'results': [
            {
                'id': p.id,
                'name': p.name,
                'codename': p.codename,
                'model': p.content_type.model,
                'app_label': p.content_type.app_label,
            }
            for p in permissions.order_by('content_type__app_label', 'content_type__model', 'codename')
        ],
    })


class PropertyReferenceDeleteGuardMixin:
    property_filter = None
    lookup_label = 'lookup'

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self, 'action', None) == 'destroy':
            return queryset.model._default_manager.select_for_update()
        return queryset

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        property_count = propertys.objects.filter(
            **{self.property_filter: instance}
        ).count()
        if property_count:
            property_label = 'property' if property_count == 1 else 'properties'
            return Response({
                'detail': (
                    f'Cannot delete this {self.lookup_label} because it is used by '
                    f'{property_count} {property_label}.'
                ),
                'property_count': property_count,
            }, status=status.HTTP_400_BAD_REQUEST)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoryViewSet(PropertyReferenceDeleteGuardMixin, viewsets.ModelViewSet):
    queryset = catagory.objects.annotate(
        property_count=property_usage_count('property_types'),
    ).order_by('id')
    serializer_class = CategorySerializer
    search_fields = ['catagorys', 'slug']
    ordering_fields = ['catagorys', 'id']
    property_filter = 'property_types'
    lookup_label = 'category'


class FacilityViewSet(viewsets.ModelViewSet):
    queryset = facilities.objects.annotate(
        property_count=property_usage_count('facilitie'),
    ).order_by('id')
    serializer_class = FacilitySerializer
    search_fields = ['facilities_name', 'slug']
    ordering_fields = ['facilities_name', 'id']


class AgentViewSet(PropertyReferenceDeleteGuardMixin, viewsets.ModelViewSet):
    queryset = egent.objects.annotate(
        listing_count=property_usage_count('agent'),
    ).order_by('id')
    serializer_class = AgentSerializer
    search_fields = ['name', 'email', 'phone_number']
    ordering_fields = ['name', 'id']
    property_filter = 'agent'
    lookup_label = 'agent'


class PropertyViewSet(viewsets.ModelViewSet):
    queryset = propertys.objects.select_related('property_types', 'agent').prefetch_related(
        Prefetch(
            'facilitie',
            queryset=facilities.objects.annotate(
                property_count=property_usage_count('facilitie'),
            ),
        ),
    ).all()
    search_fields = ['property_title', 'property_location', 'price', 'property_id']
    ordering_fields = ['property_title', 'price_amount', 'property_status', 'last_update', 'id']

    def get_serializer_class(self):
        if self.action == 'list':
            return PropertyListSerializer
        return PropertyDetailSerializer


class AboutViewSet(viewsets.ModelViewSet):
    queryset = about.objects.prefetch_related(
        'intro_paragraphs',
        'value_items',
        'why_items',
        'commitment_paragraphs',
    ).order_by('-id')
    serializer_class = AboutSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = serevices.objects.all()
    serializer_class = ServiceSerializer
    search_fields = ['service_name', 'slug']
    ordering_fields = ['service_name', 'id']


class ServicesPageViewSet(viewsets.ModelViewSet):
    queryset = servicespage.objects.prefetch_related(
        Prefetch(
            'why_items',
            queryset=servicespage_why_item.objects.filter(key__startswith='reference-'),
        ),
        Prefetch(
            'process_steps',
            queryset=servicespage_process_step.objects.filter(key__startswith='reference-'),
        ),
        'service_items__paragraphs',
        'service_items__tag_groups__items',
    ).order_by('-id')
    serializer_class = ServicesPageSerializer


class ContactViewSet(viewsets.ModelViewSet):
    queryset = contact.objects.all()
    serializer_class = ContactSerializer


class TestimonialViewSet(viewsets.ModelViewSet):
    queryset = testimonial.objects.all()
    serializer_class = TestimonialSerializer
    search_fields = ['name', 'role', 'location']
    ordering_fields = ['name', 'rating', 'created_at', 'id']
    filterset_fields = ['is_published', 'rating']


class PropertyRequestViewSet(viewsets.ModelViewSet):
    queryset = property_request.objects.all()
    search_fields = ['name', 'email', 'property_type', 'location', 'message']
    ordering_fields = ['name', 'created_at', 'is_reviewed', 'id']
    filterset_fields = ['is_reviewed', 'goal']

    def get_serializer_class(self):
        if self.action == 'list':
            return PropertyRequestListSerializer
        return PropertyRequestSerializer
