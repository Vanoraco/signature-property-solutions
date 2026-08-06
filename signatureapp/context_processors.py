from .models import home, request_form_field


def site_branding(request):
    return {
        'site_home': home.objects.order_by('-id').first(),
        # Configured "Request a Property" form fields (ordered), consumed by
        # the public property request box template. Empty until an admin
        # persists the form builder configuration.
        'request_form_fields': request_form_field.objects.order_by('position', 'id'),
    }