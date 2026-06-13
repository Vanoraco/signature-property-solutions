from django.contrib import admin

# Register your models here.
from.models import home,catagory,about,propertys,serevices,contact,egent,facilities,testimonial,property_request


class catagoryadmin(admin.ModelAdmin):
    prepopulated_fields = {'slug': ('catagorys',)}
    list_display = ('catagorys',)

class servicesadmin(admin.ModelAdmin):
    prepopulated_fields = {'slug': ('service_name',)}
    list_display = ('service_name',)

class propertyadmin(admin.ModelAdmin):
    prepopulated_fields = {'slug': ('property_title',)}
    list_display = ('property_title',)

class testimonialadmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'location', 'rating', 'is_published')
    list_filter = ('is_published', 'rating')
    search_fields = ('name', 'role', 'location', 'quote')

class propertyrequestadmin(admin.ModelAdmin):
    list_display = ('property_type', 'goal', 'location', 'budget', 'phone_number', 'is_reviewed', 'created_at')
    list_filter = ('goal', 'is_reviewed', 'created_at')
    search_fields = ('name', 'phone_number', 'email', 'property_type', 'location', 'budget', 'message')
    readonly_fields = ('created_at', 'source_page')

admin.site.register(propertys,propertyadmin)
admin.site.register(home)
admin.site.register(egent)
admin.site.register(facilities)
admin.site.register(about)
admin.site.register(contact)
admin.site.register(serevices,servicesadmin)
admin.site.register(catagory,catagoryadmin)
admin.site.register(testimonial,testimonialadmin)
admin.site.register(property_request,propertyrequestadmin)
