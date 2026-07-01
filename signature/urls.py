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

handler404 = 'signatureapp.views.handler404'
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('robots.txt', views.robots_txt, name='robots_txt' ),
    path('llms.txt', views.llms_txt, name='llms_txt' ),
    path('sitemap.xml', views.sitemap_xml, name='sitemap_xml' ),
    path(settings.ADMIN_URL, admin.site.urls),
    path('', views.index, name='index' ),
    path('aboutus', views.aboutus, name='aboutus' ),
    path('services', views.services, name='services' ),
    path('servicesdt/<slug:slug>', views.servicesdt, name='servicesdt'),
    path('search/suggest/', views.search_suggest, name='search_suggest'),
    path('search/partial/', views.properties_partial, name='properties_partial'),
    path('search/count/', views.properties_count, name='properties_count'),
    path('properties', views.properties, name='properties' ),
    path('property-request', views.submit_property_request, name='submit_property_request' ),
    path('property-assistant', views.property_assistant, name='property_assistant' ),
    path('properties/<slug:slug>', views.properties_detail, name='properties-detail'),
    path('contact', views.contact_view, name='contact' ),
    path('testimonials', views.testimonials, name='testimonials' ),
    path('filter_properties/<slug:category_slug>/', views.filter_properties, name='filter_properties'),

    
]
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
