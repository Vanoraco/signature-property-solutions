import os
import warnings
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.parse import quote

from django.conf import settings
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
)
from .serializers import (
    HomeSerializer, CategorySerializer, FacilitySerializer,
    AgentSerializer, PropertyListSerializer, PropertyDetailSerializer,
    AboutSerializer, ServiceSerializer, ContactSerializer,
    TestimonialSerializer, PropertyRequestSerializer, PropertyRequestListSerializer,
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


def _media_asset_url(relative_path):
    media_url = settings.MEDIA_URL.rstrip('/') + '/'
    return media_url + quote(relative_path, safe='/')


def _media_asset_record(path, media_root):
    try:
        resolved_path = path.resolve(strict=True)
        if not resolved_path.is_file() or not _is_within_media_root(resolved_path, media_root):
            return None
        image_format = _verified_image_format(resolved_path)
        if not image_format:
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
    if resolved_path.suffix.lower() not in SUPPORTED_MEDIA_IMAGE_FORMATS:
        raise ValidationError({'path': 'Only supported image files can be downloaded.'})
    return resolved_path


@api_view(['GET'])
@permission_classes([IsAdminUser])
def media_asset_list(request):
    media_root = _media_root()
    assets = []
    if media_root.is_dir():
        for directory, _, filenames in os.walk(media_root, followlinks=False):
            for filename in filenames:
                record = _media_asset_record(Path(directory, filename), media_root)
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
    queryset = about.objects.all()
    serializer_class = AboutSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = serevices.objects.all()
    serializer_class = ServiceSerializer
    search_fields = ['service_name', 'slug']
    ordering_fields = ['service_name', 'id']


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
