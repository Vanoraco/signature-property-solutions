from .models import home


def site_branding(request):
    return {'site_home': home.objects.order_by('-id').first()}
