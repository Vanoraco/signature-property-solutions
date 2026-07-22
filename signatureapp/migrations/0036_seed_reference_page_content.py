from django.db import migrations


REFERENCE_PREFIX = "reference-"


ABOUT_INTRO = [
    (
        "intro-1",
        "At <strong>Signature Property Solutions</strong>, we believe that every property represents more than a physical space, it is an opportunity, an investment, a home, and the foundation for future success. As a trusted real estate and property services company based in Addis Ababa, Ethiopia, we are committed to delivering comprehensive property solutions that combine professionalism, integrity, market expertise, and exceptional customer service.",
    ),
    (
        "intro-2",
        "We provide an integrated portfolio of real estate services, including luxury furnished apartments & penthouses, residential, office, and commercial property sales and rentals, property management, property marketing, investment advisory, and real estate consultancy. Our goal is to simplify every stage of the property journey by offering tailored solutions that meet the unique needs of individuals, businesses, investors, and international organizations.",
    ),
    (
        "intro-3",
        "Whether you are relocating to Ethiopia, searching for executive accommodation, investing in property, leasing commercial space, selling or buying a home, or seeking professional property management, our experienced team delivers personalized guidance and reliable solutions designed to help you make confident decisions.",
    ),
    (
        "intro-4",
        "Our luxury furnished apartment portfolio has become a preferred choice for corporate executives, diplomats, embassy personnel, expatriates, UN and NGO professionals, relocating families, and long-term business travelers who value comfort, security, convenience, and premium service.",
    ),
    (
        "intro-5",
        "At Signature Property Solutions, we don't simply facilitate property transactions—we build long-term relationships founded on trust, transparency, and excellence. Every client receives the attention, professionalism, and commitment they deserve, ensuring an experience that exceeds expectations from the first conversation to long after the transaction is complete.",
    ),
]


ABOUT_VALUES = [
    (
        "integrity",
        "Integrity",
        "We conduct every transaction with honesty, transparency, and accountability, ensuring our clients can trust us at every stage of their property journey.",
    ),
    (
        "excellence",
        "Excellence",
        "We strive for the highest standards in delivery service, continuously improving our processes to provide exceptional customer experience and premium property solutions.",
    ),
    (
        "customer-commitment",
        "Customer Commitment",
        "Our clients are at the heart of everything we do. We listen carefully, understand their objectives, and deliver solutions tailored to their unique needs.",
    ),
    (
        "professionalism",
        "Professionalism",
        "Our team operates with expertise, respect, reliability, and attention to detail, ensuring every interaction reflects the quality of our brand.",
    ),
    (
        "innovation",
        "Innovation",
        "We embrace modern technology, digital marketing, and data-driven insights to provide smarter, more efficient, and more effective property solutions.",
    ),
    (
        "trust",
        "Trust",
        "We believe strong relationships are built through consistency, transparency, and delivering on our promises.",
    ),
    (
        "collaboration",
        "Collaboration",
        "We work closely with property owners, investors, developers, businesses, and tenants to create mutually beneficial partnerships that generate long-term success.",
    ),
    (
        "sustainability",
        "Sustainability",
        "We support responsible property practices that create lasting value for our clients, communities, and the real estate industry.",
    ),
]


ABOUT_WHY = [
    (
        "comprehensive-property-solutions",
        "Comprehensive Property Solutions Under One Roof",
        "From luxury furnished apartments and residential sales to commercial leasing, property management, investment advisory, and consultancy, we provide integrated services that simplify every aspect of your property journey.",
    ),
    (
        "local-expertise-global-standards",
        "Local Expertise with Global Standards",
        "Our deep understanding of the Ethiopian real estate market, combined with internationally inspired service standards, enables us to deliver professional solutions that meet the expectations of both local and international clients.",
    ),
    (
        "premium-property-portfolio",
        "Premium Property Portfolio",
        "We carefully select and manage quality residential, commercial, and executive properties in strategic locations, ensuring our clients have access to well-maintained, secure, and high-value real estate.",
    ),
    (
        "trusted-professionals-organizations",
        "Trusted by Professionals and Organizations",
        "Our services are designed to meet the needs of corporate executives, multinational companies, embassies, diplomats, UN agencies, NGOs, expatriates, investors, and relocating families seeking dependable property solutions.",
    ),
    (
        "personalized-service",
        "Personalized Service",
        "Every client has unique goals. We take the time to understand your requirements and provide customized recommendations, transparent advice, and ongoing support throughout the entire process.",
    ),
    (
        "professional-property-management",
        "Professional Property Management",
        "We help property owners maximize returns while protecting their investments through proactive management, tenant relations, maintenance coordination, occupancy optimization, and financial oversight.",
    ),
    (
        "strategic-property-marketing",
        "Strategic Property Marketing",
        "Using professional photography, compelling content, digital advertising, search engine optimization, and targeted marketing campaigns, we position every property for maximum visibility and faster results.",
    ),
    (
        "commitment-to-excellence",
        "Commitment to Excellence",
        "We measure our success by the satisfaction of our clients. Every service we provide reflects our dedication to quality, professionalism, reliability, and continuous improvement.",
    ),
]


ABOUT_COMMITMENT = [
    (
        "commitment-1",
        "<strong>Our Commitment</strong> — At Signature Property Solutions, our commitment extends beyond property transactions. We are dedicated to creating meaningful relationships, delivering exceptional experiences, and helping our clients achieve their real estate ambitions with confidence.",
    ),
    (
        "commitment-2",
        "Whether you are searching for your next home, expanding your business, investing in property, relocating to Addis Ababa, or entrusting us with the management of your valuable assets, we are here to provide expert guidance and dependable service every step of the way.",
    ),
    (
        "commitment-3",
        "With professionalism, market expertise, and a passion for excellence, we are committed to delivering trusted property solutions that create lasting value and peace of mind.",
    ),
]


SERVICES_WHY = [
    (
        "professional-expertise",
        "Professional Expertise",
        "A dedicated team with in-depth knowledge of Ethiopia's real estate market.",
    ),
    (
        "premium-property-portfolio",
        "Premium Property Portfolio",
        "Carefully selected residential, commercial, and luxury furnished properties.",
    ),
    (
        "personalized-service",
        "Personalized Service",
        "Every client receives tailored advice and customized property solutions.",
    ),
    (
        "trusted-relationships",
        "Trusted Relationships",
        "Built on integrity, transparency, and long-term partnerships.",
    ),
    (
        "end-to-end-solutions",
        "End-to-End Solutions",
        "From acquisition and leasing to management and investment, we handle every stage of the property journey.",
    ),
    (
        "customer-first-approach",
        "Customer-First Approach",
        "Your goals are our priority, and we are committed to delivering exceptional service at every interaction.",
    ),
]


PROCESS_STEPS = [
    (
        "consultation",
        "Consultation",
        "We take time to understand your property needs and objectives.",
    ),
    (
        "property-search-assessment",
        "Property Search or Assessment",
        "Our experts identify the most suitable opportunities or evaluate your existing property.",
    ),
    (
        "recommendation",
        "Recommendation",
        "We provide clear, professional advice tailored to your goals.",
    ),
    (
        "transaction-support",
        "Transaction Support",
        "We guide you through negotiations, documentation, and closing.",
    ),
    (
        "after-sales-service",
        "After Sales Service",
        "Our relationship continues through property management, support, and future opportunities.",
    ),
]


SERVICES = [
    {
        "key": "luxury-furnished-apartments",
        "tag": "Serviced Living",
        "title": "Luxury Furnished Apartments",
        "tagline": "Executive Living Designed for Comfort",
        "copy": [
            "Experience premium long-term accommodation in Addis Ababa through our carefully selected portfolio of luxury furnished apartments.",
            "Designed for executives, diplomats, expatriates, consultants, and relocating families, our fully serviced apartments offer the perfect combination of comfort, privacy, security, and convenience.",
            "Our apartments include one-, two-, and three-bedroom options with modern interiors, fully equipped kitchens, high-speed internet, housekeeping, and premium building amenities.",
        ],
        "groups": [
            (
                "ideal-for",
                "Ideal For",
                [
                    "Corporate Executives",
                    "Diplomats",
                    "Embassy Staff",
                    "UN & NGO Professionals",
                    "Expatriates",
                    "Long-Term Business Travelers",
                    "Relocating Families",
                    "Diaspora Guests",
                ],
            ),
            (
                "features",
                "Features",
                [
                    "Fully Furnished Apartments",
                    "Minimum Stay of 30 Nights",
                    "High-Speed Wi-Fi",
                    "Modern Kitchens",
                    "Housekeeping Services",
                    "Secure Free-Parking",
                    "Gym Access",
                    "24/7 Reception",
                    "CCTV & Security",
                    "Backup Generator",
                    "Prime Addis Ababa Locations (Specific supermarkets, international schools, Hospitals,",
                ],
            ),
        ],
    },
    {
        "key": "residential-sales-rentals",
        "tag": "Residential",
        "title": "Find Your Executive Home — Residential Property Sales & Rentals",
        "tagline": "Helping You Find the Perfect Home",
        "copy": [
            "Whether you're purchasing your first home, relocating, investing, or searching for a rental property, we connect you with quality residential properties that match your lifestyle and budget.",
            "Our experienced advisors guide you through every step of the buying, selling, or leasing process to ensure a smooth and informed experience.",
        ],
        "groups": [
            (
                "services-include",
                "Services Include",
                [
                    "Property Buying",
                    "Property Selling",
                    "Long-Term Rentals",
                    "Lease Management",
                    "Property Marketing",
                    "Property Management",
                ],
            ),
        ],
    },
    {
        "key": "commercial",
        "tag": "Commercial",
        "title": "Commercial Property Solutions",
        "tagline": "Business Spaces That Drive Success",
        "copy": [
            "Finding the right commercial property is critical to business growth.",
            "We help businesses secure strategic commercial spaces that support operational efficiency and long-term success.",
        ],
        "groups": [
            (
                "property-types",
                "Property Types",
                [
                    "Office Buildings",
                    "Office Spaces",
                    "Retail Shops",
                    "Commercial Buildings",
                    "Warehouses",
                    "Industrial Properties",
                    "Mixed-Use Developments",
                    "Land for Commercial Development",
                ],
            ),
        ],
    },
    {
        "key": "property-management",
        "tag": "Management",
        "title": "Property Management",
        "tagline": "Protecting and Maximizing Your Investment",
        "copy": [
            "Owning property should be rewarding—not stressful.",
            "Our professional property management services ensure your investment remains profitable, well-maintained, and professionally managed.",
            "We handle day-to-day operations while keeping owners informed through transparent reporting and proactive communication.",
        ],
        "groups": [
            (
                "our-services",
                "Our Services",
                [
                    "Tenant Screening",
                    "Lease Administration",
                    "Rent Collection",
                    "Property Maintenance",
                    "Vendor Coordination",
                    "Property Inspections",
                    "Financial Reporting",
                    "Occupancy Optimization",
                ],
            ),
        ],
    },
    {
        "key": "property-marketing",
        "tag": "Marketing",
        "title": "Property Marketing",
        "tagline": "Selling and Leasing Properties Faster",
        "copy": [
            "We combine professional marketing strategies with modern technology to maximize your property's visibility and attract qualified buyers and tenants.",
            "Our marketing approach includes premium photography, compelling content, digital advertising, and listing optimization across leading property platforms.",
        ],
        "groups": [
            (
                "marketing-services",
                "Marketing Services",
                [
                    "Professional Photography",
                    "Virtual Tours",
                    "Property Branding",
                    "Digital Marketing",
                    "Social Media Promotion",
                    "Listing Optimization",
                    "Google Business Optimization",
                    "SEO",
                    "Lead Generation",
                ],
            ),
        ],
    },
    {
        "key": "investment-advisory",
        "tag": "Investment",
        "title": "Property Investment Advisory",
        "tagline": "Make Smarter Investment Decisions",
        "copy": [
            "Real estate is one of the most valuable investments when guided by reliable market intelligence.",
            "We help investors identify high-potential opportunities, evaluate returns, and build sustainable property portfolios.",
        ],
        "groups": [
            (
                "investment-services",
                "Investment Services",
                [
                    "Investment Advisory",
                    "Property Portfolio Planning",
                    "Market Research",
                    "ROI Analysis",
                    "Risk Assessment",
                    "Property Acquisition Support",
                ],
            ),
        ],
    },
    {
        "key": "consultancy",
        "tag": "Consultancy",
        "title": "Real Estate Consultancy",
        "tagline": "Expert Advice Backed by Market Knowledge",
        "copy": [
            "Our consultancy services support individuals, developers, businesses, and investors with strategic real estate insights and professional guidance.",
            "Whether you're evaluating a new project or seeking independent advice, our team provides practical, data-driven recommendations.",
        ],
        "groups": [
            (
                "consultancy-areas",
                "Consultancy Areas",
                [
                    "Market Analysis",
                    "Property Feasibility Studies",
                    "Development Advisory",
                    "Asset Optimization",
                    "Investment Planning",
                    "Property Strategy",
                ],
            ),
        ],
    },
    {
        "key": "corporate-housing-relocation",
        "tag": "Relocation",
        "title": "Corporate Housing & Relocation Services",
        "tagline": "Making Every Relocation Effortless",
        "copy": [
            "We provide premium accommodation solutions tailored for organizations relocating employees, consultants, diplomats, and executives to Addis Ababa.",
            "Our relocation services ensure clients experience a smooth transition from arrival to move-in.",
        ],
        "groups": [
            (
                "corporate-solutions",
                "Corporate Solutions",
                [
                    "Executive Apartments",
                    "Staff Accommodation",
                    "Embassy Housing",
                    "NGO Housing",
                    "Project-Based Accommodation",
                    "Long-Term Leasing",
                    "Relocation Assistance",
                ],
            ),
        ],
    },
]


def reference_key(key):
    return f"{REFERENCE_PREFIX}{key}"


def sync_keyed_rows(model, parent_name, parent, rows, field_names):
    owned_keys = []
    for order, row in enumerate(rows):
        raw_key, *values = row
        key = reference_key(raw_key)
        owned_keys.append(key)
        defaults = {name: value for name, value in zip(field_names, values)}
        defaults["order"] = order
        model.objects.update_or_create(
            **{parent_name: parent, "key": key},
            defaults=defaults,
        )

    filters = {parent_name: parent, "key__startswith": REFERENCE_PREFIX}
    model.objects.filter(**filters).exclude(key__in=owned_keys).delete()


def sync_existing_or_keyed_rows(model, page, rows):
    owned_keys = []
    for order, (raw_key, title, text) in enumerate(rows):
        key = reference_key(raw_key)
        owned_keys.append(key)
        model.objects.update_or_create(
            page=page,
            key=key,
            defaults={"title": title, "text": text, "order": order},
        )

    model.objects.filter(
        page=page,
        key__startswith=REFERENCE_PREFIX,
    ).exclude(key__in=owned_keys).delete()


def seed_reference_content(apps, schema_editor):
    About = apps.get_model("signatureapp", "about")
    AboutIntroParagraph = apps.get_model("signatureapp", "AboutIntroParagraph")
    AboutValueItem = apps.get_model("signatureapp", "AboutValueItem")
    AboutWhyItem = apps.get_model("signatureapp", "AboutWhyItem")
    AboutCommitmentParagraph = apps.get_model(
        "signatureapp", "AboutCommitmentParagraph"
    )
    ServicesPage = apps.get_model("signatureapp", "servicespage")
    ServicesWhyItem = apps.get_model("signatureapp", "servicespage_why_item")
    ServicesProcessStep = apps.get_model(
        "signatureapp", "servicespage_process_step"
    )
    ServicesPageService = apps.get_model("signatureapp", "ServicesPageService")
    ServicesPageServiceParagraph = apps.get_model(
        "signatureapp", "ServicesPageServiceParagraph"
    )
    ServicesPageServiceTagGroup = apps.get_model(
        "signatureapp", "ServicesPageServiceTagGroup"
    )
    ServicesPageServiceTagItem = apps.get_model(
        "signatureapp", "ServicesPageServiceTagItem"
    )

    about_page = About.objects.order_by("pk").last()
    if about_page is None:
        about_page = About.objects.create(image="", ceo_description="")
    about_page.hero_eyebrow = "About Signature Property Solutions"
    about_page.hero_title = "Your Trusted Partner for Real Estate & Property Solutions"
    about_page.hero_lead = (
        "A trusted real estate and property services company based in Addis Ababa, "
        "Ethiopia — combining professionalism, integrity, market expertise, and "
        "exceptional customer service."
    )
    about_page.vision_statement = (
        "To become Ethiopia's most trusted, innovative, and customer-focused real "
        "estate and property services company, recognized for delivering exceptional "
        "property experiences, creating long-term value, and setting the benchmark "
        "for excellence across residential, commercial, hospitality, and investment "
        "real estate."
    )
    about_page.mission_statement = (
        "To provide comprehensive real estate and property solutions through "
        "professional expertise, ethical business practices, innovative technology, "
        "and personalized customer service. We are committed to helping individuals, "
        "businesses, investors, and international organizations achieve their "
        "property goals while building lasting relationships based on trust, "
        "integrity, and excellence."
    )
    about_page.why_choose_title = "Why Choose Signature Property Solutions?"
    about_page.commitment_promise = "Your property goals become our priority."
    about_page.save(
        update_fields=[
            "hero_eyebrow",
            "hero_title",
            "hero_lead",
            "vision_statement",
            "mission_statement",
            "why_choose_title",
            "commitment_promise",
        ]
    )

    sync_keyed_rows(
        AboutIntroParagraph,
        "page",
        about_page,
        ABOUT_INTRO,
        ("text",),
    )
    sync_keyed_rows(
        AboutValueItem,
        "page",
        about_page,
        ABOUT_VALUES,
        ("tag", "text"),
    )
    sync_keyed_rows(
        AboutWhyItem,
        "page",
        about_page,
        ABOUT_WHY,
        ("title", "text"),
    )
    sync_keyed_rows(
        AboutCommitmentParagraph,
        "page",
        about_page,
        ABOUT_COMMITMENT,
        ("text",),
    )

    services_page = ServicesPage.objects.order_by("pk").last()
    if services_page is None:
        services_page = ServicesPage.objects.create()
    services_page.hero_eyebrow = "Our Services"
    services_page.hero_title = "Comprehensive Real Estate & Property Solutions"
    services_page.hero_lead = (
        "End-to-end real estate and property services designed to meet the diverse "
        "needs of homeowners, businesses, investors, expatriates, and international "
        "organizations."
    )
    services_page.intro = (
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
    services_page.why_choose_title = "Why Choose Signature Property Solutions?"
    services_page.process_title = "Our Process"
    services_page.save(
        update_fields=[
            "hero_eyebrow",
            "hero_title",
            "hero_lead",
            "intro",
            "why_choose_title",
            "process_title",
        ]
    )

    sync_existing_or_keyed_rows(ServicesWhyItem, services_page, SERVICES_WHY)
    sync_existing_or_keyed_rows(ServicesProcessStep, services_page, PROCESS_STEPS)

    service_keys = []
    for service_order, service_data in enumerate(SERVICES):
        service_key = reference_key(service_data["key"])
        service_keys.append(service_key)
        service, _ = ServicesPageService.objects.update_or_create(
            page=services_page,
            key=service_key,
            defaults={
                "tag": service_data["tag"],
                "title": service_data["title"],
                "tagline": service_data["tagline"],
                "order": service_order,
            },
        )

        paragraph_rows = [
            (f"paragraph-{index + 1}", text)
            for index, text in enumerate(service_data["copy"])
        ]
        sync_keyed_rows(
            ServicesPageServiceParagraph,
            "service",
            service,
            paragraph_rows,
            ("text",),
        )

        group_keys = []
        for group_order, (group_raw_key, group_title, items) in enumerate(
            service_data["groups"]
        ):
            group_key = reference_key(group_raw_key)
            group_keys.append(group_key)
            group, _ = ServicesPageServiceTagGroup.objects.update_or_create(
                service=service,
                key=group_key,
                defaults={"title": group_title, "order": group_order},
            )
            item_rows = [
                (f"item-{index + 1}", text) for index, text in enumerate(items)
            ]
            sync_keyed_rows(
                ServicesPageServiceTagItem,
                "group",
                group,
                item_rows,
                ("text",),
            )

        ServicesPageServiceTagGroup.objects.filter(
            service=service,
            key__startswith=REFERENCE_PREFIX,
        ).exclude(key__in=group_keys).delete()

    ServicesPageService.objects.filter(
        page=services_page,
        key__startswith=REFERENCE_PREFIX,
    ).exclude(key__in=service_keys).delete()


def remove_reference_content(apps, schema_editor):
    model_names = [
        "AboutIntroParagraph",
        "AboutValueItem",
        "AboutWhyItem",
        "AboutCommitmentParagraph",
        "servicespage_why_item",
        "servicespage_process_step",
        "ServicesPageServiceTagItem",
        "ServicesPageServiceParagraph",
        "ServicesPageServiceTagGroup",
        "ServicesPageService",
    ]
    for model_name in model_names:
        model = apps.get_model("signatureapp", model_name)
        model.objects.filter(key__startswith=REFERENCE_PREFIX).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("signatureapp", "0035_add_reference_page_content"),
    ]

    operations = [
        migrations.RunPython(seed_reference_content, remove_reference_content),
    ]
