"""
URL configuration for signature project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from signatureapp import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index' ),
    path('aboutus', views.aboutus, name='aboutus' ),
    path('services', views.services, name='services' ),
    path('servicesdt/<slug:slug>', views.servicesdt, name='servicesdt'),
    path('properteas', views.properteas, name='properteas' ),
    path('properteasdet/<slug:slug>', views.properteasdet, name='properteasdet'),
    path('contac', views.contac, name='contac' ),
    path('testimonials', views.testimonials, name='testimonials' ),
    path('filter_properties/<slug:category_slug>/', views.filter_properties, name='filter_properties'),

    
]
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
