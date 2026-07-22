from django.db import migrations


WHY_ITEMS = [
    ("Professional Expertise", "A dedicated team with in-depth knowledge of Ethiopia's real estate market."),
    ("Premium Property Portfolio", "Carefully selected residential, commercial, and luxury furnished properties."),
    ("Personalized Service", "Every client receives tailored advice and customized property solutions."),
    ("Trusted Relationships", "Built on integrity, transparency, and long-term partnerships."),
    ("End-to-End Solutions", "From acquisition and leasing to management and investment, we handle every stage of the property journey."),
    ("Customer-First Approach", "Your goals are our priority, and we are committed to delivering exceptional service at every interaction."),
]

PROCESS_STEPS = [
    ("Consultation", "We take time to understand your property needs and objectives."),
    ("Property Search or Assessment", "Our experts identify the most suitable opportunities or evaluate your existing property."),
    ("Recommendation", "We provide clear, professional advice tailored to your goals."),
    ("Transaction Support", "We guide you through negotiations, documentation, and closing."),
    ("After Sales Service", "Our relationship continues through property management, support, and future opportunities."),
]

HERO_EYEBROW = "Our Services"
HERO_TITLE = "Comprehensive Real Estate & Property Solutions"
HERO_LEAD = (
    "End-to-end real estate and property services designed to meet the diverse "
    "needs of homeowners, businesses, investors, expatriates, and international "
    "organizations."
)
INTRO_HTML = (
    "<p>At Signature Property Solutions, we provide end-to-end real estate and "
    "property services designed to meet the diverse needs of homeowners, "
    "businesses, investors, expatriates, and international organizations.</p>"
    "<p>Whether you're looking to buy, sell, rent, lease, invest, or "
    "professionally manage a property, our experienced team delivers tailored "
    "solutions with integrity, market expertise, and exceptional customer "
    "service.</p>"
    "<p>Our mission is simple: to make every property journey smooth, "
    "transparent, and rewarding.</p>"
)


def seed_services_page(apps, schema_editor):
    servicespage = apps.get_model("signatureapp", "servicespage")
    why_item = apps.get_model("signatureapp", "servicespage_why_item")
    process_step = apps.get_model("signatureapp", "servicespage_process_step")

    if servicespage.objects.exists():
        return

    page = servicespage.objects.create(
        hero_eyebrow=HERO_EYEBROW,
        hero_title=HERO_TITLE,
        hero_lead=HERO_LEAD,
        intro=INTRO_HTML,
        why_choose_title="Why Choose Signature Property Solutions?",
        process_title="Our Process",
    )
    for order, (title, text) in enumerate(WHY_ITEMS):
        why_item.objects.create(page=page, title=title, text=text, order=order)
    for order, (title, text) in enumerate(PROCESS_STEPS):
        process_step.objects.create(page=page, title=title, text=text, order=order)


class Migration(migrations.Migration):

    dependencies = [
        ("signatureapp", "0032_servicespage_about_commitment_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_services_page, migrations.RunPython.noop),
    ]
