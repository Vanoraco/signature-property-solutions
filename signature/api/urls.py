from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, user_me,
    HomeViewSet, CategoryViewSet, FacilityViewSet, AgentViewSet,
    PropertyViewSet, AboutViewSet, ServiceViewSet, ContactViewSet,
    TestimonialViewSet, PropertyRequestViewSet,
)

router = DefaultRouter()
router.register(r'home', HomeViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'facilities', FacilityViewSet)
router.register(r'agents', AgentViewSet)
router.register(r'properties', PropertyViewSet)
router.register(r'about', AboutViewSet)
router.register(r'services', ServiceViewSet)
router.register(r'contact', ContactViewSet)
router.register(r'testimonials', TestimonialViewSet)
router.register(r'requests', PropertyRequestViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', LoginView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', user_me, name='user_me'),
]
