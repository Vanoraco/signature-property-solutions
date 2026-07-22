from django.contrib import admin

# Register your models here.
from.models import home,catagory,about,propertys,serevices,contact,egent,facilities,testimonial,property_request
from.models import (
    servicespage, servicespage_why_item, servicespage_process_step,
    AboutIntroParagraph, AboutValueItem, AboutWhyItem,
    AboutCommitmentParagraph, ServicesPageService,
    ServicesPageServiceParagraph, ServicesPageServiceTagGroup,
    ServicesPageServiceTagItem,
)


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

class aboutintroparagraphinline(admin.TabularInline):
    model = AboutIntroParagraph
    extra = 0
    fields = ('key', 'text', 'order')

class aboutvalueiteminline(admin.TabularInline):
    model = AboutValueItem
    extra = 0
    fields = ('key', 'tag', 'text', 'order')

class aboutwhyiteminline(admin.TabularInline):
    model = AboutWhyItem
    extra = 0
    fields = ('key', 'title', 'text', 'order')

class aboutcommitmentparagraphinline(admin.TabularInline):
    model = AboutCommitmentParagraph
    extra = 0
    fields = ('key', 'text', 'order')

class aboutadmin(admin.ModelAdmin):
    inlines = [
        aboutintroparagraphinline,
        aboutvalueiteminline,
        aboutwhyiteminline,
        aboutcommitmentparagraphinline,
    ]

class whyiteminline(admin.TabularInline):
    model = servicespage_why_item
    extra = 1
    fields = ('key', 'title', 'text', 'order')

class processstepinline(admin.TabularInline):
    model = servicespage_process_step
    extra = 1
    fields = ('key', 'title', 'text', 'order')

class serviceiteminline(admin.TabularInline):
    model = ServicesPageService
    extra = 0
    fields = ('key', 'tag', 'title', 'tagline', 'order')
    show_change_link = True

class servicespageadmin(admin.ModelAdmin):
    inlines = [serviceiteminline, whyiteminline, processstepinline]

class serviceparagraphinline(admin.TabularInline):
    model = ServicesPageServiceParagraph
    extra = 0
    fields = ('key', 'text', 'order')

class servicetaggroupinline(admin.TabularInline):
    model = ServicesPageServiceTagGroup
    extra = 0
    fields = ('key', 'title', 'order')
    show_change_link = True

class servicespageserviceadmin(admin.ModelAdmin):
    list_display = ('title', 'tag', 'page', 'order')
    list_filter = ('page', 'tag')
    search_fields = ('title', 'tag', 'tagline')
    inlines = [serviceparagraphinline, servicetaggroupinline]

class servicetagiteminline(admin.TabularInline):
    model = ServicesPageServiceTagItem
    extra = 0
    fields = ('key', 'text', 'order')

class servicespageservicetaggroupadmin(admin.ModelAdmin):
    list_display = ('title', 'service', 'order')
    search_fields = ('title', 'service__title')
    inlines = [servicetagiteminline]

admin.site.register(propertys,propertyadmin)
admin.site.register(home)
admin.site.register(egent)
admin.site.register(facilities)
admin.site.register(about,aboutadmin)
admin.site.register(contact)
admin.site.register(serevices,servicesadmin)
admin.site.register(catagory,catagoryadmin)
admin.site.register(testimonial,testimonialadmin)
admin.site.register(property_request,propertyrequestadmin)
admin.site.register(servicespage,servicespageadmin)
admin.site.register(ServicesPageService,servicespageserviceadmin)
admin.site.register(ServicesPageServiceTagGroup,servicespageservicetaggroupadmin)
