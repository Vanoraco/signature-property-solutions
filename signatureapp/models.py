import re

from django.db import models
from multiselectfield import MultiSelectField
from ckeditor.fields import RichTextField


PROPERTY_ID_PREFIX = "SPS"

# Create your models here.


class home(models.Model):
    image= models.ImageField(upload_to ='home info', blank=True )
    slogon = models.CharField(max_length=600, blank=True)
    title = models.CharField(max_length=600, blank=True)
    video = models.FileField(upload_to='videos_uploaded',null=True,)
    

    class Meta:
        verbose_name =("home_info")
        verbose_name_plural =("Home Information")

    def __str__(self):
        return self.title


class catagory(models.Model):
    
    catagorys= models.CharField(max_length=600, blank=True)
    slug= models.SlugField(unique=True, null=False, blank=True)
    icon= models.ImageField(upload_to ='catagory')
    class Meta:
        verbose_name = 'Catagory'
        verbose_name_plural = 'Category'

    def __str__(self):
        return self.catagorys
class facilities(models.Model):
    
    facilities_name= models.CharField(max_length=600, blank=True)
    slug= models.SlugField(unique=True, null=False, blank=True)
    class Meta:
        verbose_name = 'facilities'
        verbose_name_plural = 'Facilities List'

    def __str__(self):
        return self.facilities_name
        
class egent(models.Model):
    name=models.CharField(max_length=600, blank=True)
    image= models.ImageField(upload_to ='home info', blank=True )
    phone_number=models.CharField(max_length=600, blank=True)
    office_phone=models.CharField(max_length=600, blank=True)
    email=models.CharField(max_length=600, blank=True)
    facebook=models.CharField(max_length=600, blank=True)
    instagram=models.CharField(max_length=600, blank=True)
    linkden=models.CharField(max_length=600, blank=True)
    
    class Meta:
        verbose_name =("egent")
        verbose_name_plural =("Agent")
        ordering = ["-id"]

    def __str__(self):
        return self.name

class propertys(models.Model):
    STATUS= [
        ('For Sale','For Sale'),
        ('For Rent','For Rent'),
    ]

    property_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    property_title= models.CharField(max_length=600, blank=True)
    slug= models.SlugField(unique=True, null=False)
    price = models.CharField(max_length=100,blank=True)
    price_amount   = models.IntegerField(null=True, blank=True, help_text="Numeric price value, parsed from price text")
    price_currency = models.CharField(max_length=8, blank=True, default='', help_text="ETB, USD, or empty")
    property_types = models.ForeignKey(catagory, on_delete=models.PROTECT)
    agent = models.ForeignKey(egent, on_delete=models.PROTECT,blank=True,null=True )
    facilitie = models.ManyToManyField(facilities )
    property_location= models.CharField(max_length=100,blank=True)
    property_size =models.IntegerField()
    property_area =models.IntegerField()
    property_status = models.CharField(max_length=100, choices=STATUS,default='draft')
    property_floor =models.IntegerField()
    bedrooms= models.CharField(max_length=100,blank=True)
    bathrooms= models.CharField(max_length=100,blank=True)
    furnished= models.CharField(max_length=100,blank=True)
    property_short_discription= models.TextField(blank=True)
    main_image = models.ImageField(upload_to ='products', blank=True)
    slide_1 = models.ImageField(upload_to ='products', blank=True)
    slide_2 = models.ImageField(upload_to ='products', blank=True)
    slide_3 = models.ImageField(upload_to ='products', blank=True)
    slide_4 = models.ImageField(upload_to ='products', blank=True)
    slide_5 = models.ImageField(upload_to ='products', blank=True)
    slide_6 = models.ImageField(upload_to ='products', blank=True)
    video_link=models.URLField(max_length=600, blank=True)
    last_update = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name =("propertys")
        verbose_name_plural =("Propertys")

    def __str__(self):
        return self.property_title

    def save(self, *args, **kwargs):
        # Parse price text into numeric fields
        if self.price:
            self._parse_price()
        else:
            self.price_amount = None
            self.price_currency = ''
        # Auto-generate a property id when one was not supplied
        if not self.property_id:
            self.property_id = self._generate_property_id()
        super().save(*args, **kwargs)

    def _generate_property_id(self):
        """Generate the next sequential property id (e.g. SPS12).

        Looks at the trailing number of every existing property_id and starts
        one past the highest, then loops to guarantee uniqueness.
        """
        max_num = 0
        existing_ids = (
            propertys.objects
            .exclude(property_id__isnull=True)
            .exclude(property_id='')
            .values_list('property_id', flat=True)
        )
        for pid in existing_ids:
            match = re.search(r'(\d+)$', pid)
            if match:
                max_num = max(max_num, int(match.group(1)))
        number = max_num + 1
        while True:
            candidate = f"{PROPERTY_ID_PREFIX}{number:02d}"
            if not propertys.objects.filter(property_id=candidate).exists():
                return candidate
            number += 1

    def _parse_price(self):
        """Parse the free-text price into price_amount and price_currency.

        Requires a recognized currency ($ / usd -> USD, br / birr / etb -> ETB).
        Prices without a recognized currency (e.g. '1000 Per Sqm', 'Negotiable')
        yield (None, '') so the property stays visible but is excluded from
        price-range filters.
        """
        raw = (self.price or '').strip()
        if not raw:
            self.price_amount = None
            self.price_currency = ''
            return
        lower = raw.lower()
        currency = ''
        if '$' in raw or 'usd' in lower:
            currency = 'USD'
        elif any(kw in lower for kw in ('br', 'birr', 'etb')):
            currency = 'ETB'
        if not currency:
            self.price_amount = None
            self.price_currency = ''
            return
        digits = ''.join(ch for ch in raw if ch.isdigit())
        if digits:
            self.price_amount = int(digits)
            self.price_currency = currency
        else:
            self.price_amount = None
            self.price_currency = ''

    @property
    def video_embed_url(self):
        """Convert a video link into a URL that can be embedded in an iframe.

        YouTube watch / youtu.be / shorts links are rewritten to the /embed/
        form (raw watch/shorts URLs are blocked from framing by YouTube).
        Vimeo links become player.vimeo.com/video/<id>. Anything that already
        looks embeddable (or is unrecognized) is returned unchanged.
        """
        url = (self.video_link or "").strip()
        if not url:
            return ""

        youtube_patterns = (
            r'youtube\.com/watch\?v=([A-Za-z0-9_-]{6,})',
            r'youtu\.be/([A-Za-z0-9_-]{6,})',
            r'youtube\.com/shorts/([A-Za-z0-9_-]{6,})',
            r'youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{6,})',
        )
        for pattern in youtube_patterns:
            match = re.search(pattern, url)
            if match:
                return f"https://www.youtube.com/embed/{match.group(1)}"

        vimeo_match = re.search(r'vimeo\.com/(?:video/)?(\d+)', url)
        if vimeo_match:
            return f"https://player.vimeo.com/video/{vimeo_match.group(1)}"

        return url

    def _property_type_name(self):
        if not self.property_types_id:
            return ""
        return (self.property_types.catagorys or "").lower()

    @staticmethod
    def _has_display_value(value):
        if value is None:
            return False
        text = str(value).strip()
        return bool(text) and text.lower() not in {"0", "no", "none", "n/a", "na"}

    def is_land_listing(self):
        return "land" in self._property_type_name()

    def is_residential_listing(self):
        property_type = self._property_type_name()
        return any(
            keyword in property_type
            for keyword in ("apartment", "house", "villa", "penthouse", "condo")
        )

    def card_specs(self):
        if self.is_land_listing():
            specs = [
                ("fas fa-ruler-combined", "Land Area", self.property_area),
                ("fas fa-expand-arrows-alt", "Size", self.property_size),
            ]
        elif self.is_residential_listing():
            specs = [
                ("fas fa-bed", "Beds", self.bedrooms),
                ("fas fa-bath", "Baths", self.bathrooms),
            ]
        else:
            specs = [
                ("fas fa-expand-arrows-alt", "Size", self.property_size),
                ("fas fa-building", "Floor", self.property_floor),
            ]

        return [
            {"icon": icon, "label": label, "value": value}
            for icon, label, value in specs
            if self._has_display_value(value)
        ]

    def overview_specs(self):
        specs = [
            ("Property ID", self.property_id),
            ("Price", self.price),
            ("Type", self.property_types),
            ("Status", self.property_status),
        ]

        if self.is_land_listing():
            specs.extend([
                ("Land Area", self.property_area),
                ("Size", self.property_size),
            ])
        elif self.is_residential_listing():
            specs.extend([
                ("Size", self.property_size),
                ("Land Area", self.property_area),
                ("Floor", self.property_floor),
                ("Bedrooms", self.bedrooms),
                ("Bathrooms", self.bathrooms),
                ("Furnished", self.furnished),
            ])
        else:
            specs.extend([
                ("Size", self.property_size),
                ("Floor", self.property_floor),
                ("Restrooms", self.bathrooms),
                ("Furnished", self.furnished),
            ])

        return [
            {"label": label, "value": value}
            for label, value in specs
            if self._has_display_value(value)
        ]
    

class about(models.Model):
    image= models.ImageField(upload_to ='about')
    hading = models.CharField(max_length=600,blank=True)
    title = models.CharField(max_length=600,blank=True)
    aboutus = RichTextField(blank=True)
    aboutus_image= models.ImageField(upload_to ='about',blank=True)
    vision = RichTextField(blank=True)
    vision_image= models.ImageField(upload_to ='about',blank=True)
    mission = RichTextField(blank=True)
    mission_image= models.ImageField(upload_to ='about',blank=True)
    value = RichTextField(blank=True)
    value_image= models.ImageField(upload_to ='about',blank=True)
    why_choose_us_header= models.CharField(max_length=600,blank=True)
    tytle = models.CharField(max_length=600,blank=True)
    description = RichTextField(blank=True)
    ceo_image= models.ImageField(upload_to ='about',blank=True)
    ceo_name = models.CharField(max_length=600,blank=True)
    ceo_position = models.CharField(max_length=600,blank=True)
    ceo_description = RichTextField()
    ceo_facebook=models.CharField(max_length=600, blank=True)
    ceo_twitter=models.CharField(max_length=600, blank=True)
    ceo_linkden=models.CharField(max_length=600, blank=True)


    class Meta:
        verbose_name =("about")
        verbose_name_plural =("About Us")

    def __str__(self):
        return self.title

class serevices(models.Model):
    icon= models.ImageField(upload_to ='partners')
    service_name=models.CharField(max_length=600, blank=True)
    slug= models.SlugField(unique=True, null=False, blank=True)
    short_discriptions= RichTextField()
    Discription=RichTextField()
    image= models.ImageField(upload_to ='partners',blank=True)

    class Meta:
        verbose_name =("serevices")
        verbose_name_plural =("Serevices")
    
    def __str__(self):
        return self.service_name
class contact(models.Model):
    google_map=models.CharField(max_length=600, blank=True)
    phone_number=models.CharField(max_length=600, blank=True)
    office_phone=models.CharField(max_length=600, blank=True)
    email=models.CharField(max_length=600, blank=True)
    website=models.CharField(max_length=600, blank=True)
    address=models.CharField(max_length=600, blank=True)
    facebook=models.CharField(max_length=600, blank=True)
    instagram=models.CharField(max_length=600, blank=True)
    linkden=models.CharField(max_length=600, blank=True)
    
    class Meta:
        verbose_name =("contact")
        verbose_name_plural =("Contact Us")

    def __str__(self):
        return self.email


class testimonial(models.Model):
    RATING = [
        (1, "1 Star"),
        (2, "2 Stars"),
        (3, "3 Stars"),
        (4, "4 Stars"),
        (5, "5 Stars"),
    ]

    name = models.CharField(max_length=200)
    role = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    quote = models.TextField()
    image = models.ImageField(upload_to='testimonials', blank=True)
    rating = models.PositiveSmallIntegerField(choices=RATING, default=5)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = ("testimonial")
        verbose_name_plural = ("Testimonials")
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class property_request(models.Model):
    PROPERTY_GOALS = [
        ("Rent", "Rent"),
        ("Buy", "Buy"),
        ("Invest", "Invest"),
        ("Other", "Other"),
    ]

    name = models.CharField(max_length=200, blank=True)
    phone_number = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    property_type = models.CharField(max_length=200, blank=True)
    goal = models.CharField(max_length=50, choices=PROPERTY_GOALS, blank=True)
    location = models.CharField(max_length=200, blank=True)
    budget = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    source_page = models.CharField(max_length=600, blank=True)
    is_reviewed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = ("property_request")
        verbose_name_plural = ("Property Requests")
        ordering = ["-created_at"]

    def __str__(self):
        return self.property_type or self.location or f"Request #{self.pk}"
