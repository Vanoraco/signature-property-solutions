from django.db import migrations


DEFAULT_OPTIONS = {
    "property_type": [
        "Apartment", "Penthouse", "House", "Building",
        "Warehouse", "Office", "Land",
    ],
    "goal": ["Rent", "Buy", "Invest", "Other"],
}

DEFAULT_FIELDS = [
    ("name", "Full Name", "text", True),
    ("phone_number", "Phone Number", "tel", True),
    ("email", "Email Address", "email", False),
    ("property_type", "Property Type", "select", True),
    ("goal", "Goal", "select", True),
    ("location", "Preferred Location", "text", False),
    ("budget", "Budget", "text", False),
    ("message", "Message", "textarea", True),
]


def seed_request_form_fields(apps, schema_editor):
    request_form_field = apps.get_model("signatureapp", "request_form_field")
    for position, (key, label, field_type, is_required) in enumerate(DEFAULT_FIELDS):
        request_form_field.objects.create(
            key=key,
            label=label,
            field_type=field_type,
            is_required=bool(is_required),
            options=DEFAULT_OPTIONS.get(key, []),
            position=position,
        )


def clear_request_form_fields(apps, schema_editor):
    request_form_field = apps.get_model("signatureapp", "request_form_field")
    request_form_field.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("signatureapp", "0038_request_form_field_property_request_answers"),
    ]

    operations = [
        migrations.RunPython(seed_request_form_fields, clear_request_form_fields),
    ]