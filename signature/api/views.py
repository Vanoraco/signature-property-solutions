from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
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


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'is_staff': self.user.is_staff,
        }
        return data


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
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


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = catagory.objects.all()
    serializer_class = CategorySerializer
    search_fields = ['catagorys', 'slug']
    ordering_fields = ['catagorys', 'id']


class FacilityViewSet(viewsets.ModelViewSet):
    queryset = facilities.objects.all()
    serializer_class = FacilitySerializer
    search_fields = ['facilities_name', 'slug']
    ordering_fields = ['facilities_name', 'id']


class AgentViewSet(viewsets.ModelViewSet):
    queryset = egent.objects.all()
    serializer_class = AgentSerializer
    search_fields = ['name', 'email', 'phone_number']
    ordering_fields = ['name', 'id']


class PropertyViewSet(viewsets.ModelViewSet):
    queryset = propertys.objects.select_related('property_types', 'agent').prefetch_related('facilitie').all()
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
