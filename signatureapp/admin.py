from django.contrib import admin

# Register your models here.
from.models import home,catagory,about,propertys,serevices,contact,egent,facilities


class catagoryadmin(admin.ModelAdmin):
    prepopulated_fields = {'slug': ('catagorys',)}
    list_display = ('catagorys',)

class servicesadmin(admin.ModelAdmin):
    prepopulated_fields = {'slug': ('service_name',)}
    list_display = ('service_name',)

class propertyadmin(admin.ModelAdmin):
    prepopulated_fields = {'slug': ('property_title',)}
    list_display = ('property_title',)

admin.site.register(propertys,propertyadmin)
admin.site.register(home)
admin.site.register(egent)
admin.site.register(facilities)
admin.site.register(about)
admin.site.register(contact)
admin.site.register(serevices,servicesadmin)
admin.site.register(catagory,catagoryadmin)