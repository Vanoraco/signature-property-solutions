from django.db import models
from multiselectfield import MultiSelectField
from ckeditor.fields import RichTextField

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
    property_types = models.ForeignKey(catagory, on_delete=models.CASCADE)
    agent = models.ForeignKey(egent, on_delete=models.CASCADE,blank=True,null=True )
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
