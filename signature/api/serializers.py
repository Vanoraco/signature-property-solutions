from rest_framework import serializers
from signatureapp.models import (
    home, catagory, facilities, egent, propertys,
    about, serevices, contact, testimonial, property_request,
)


class HomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = home
        fields = '__all__'


class CategorySerializer(serializers.ModelSerializer):
    property_count = serializers.SerializerMethodField()

    class Meta:
        model = catagory
        fields = '__all__'

    def get_property_count(self, obj):
        if hasattr(obj, 'property_count'):
            return obj.property_count
        return propertys.objects.filter(property_types=obj).count()


class FacilitySerializer(serializers.ModelSerializer):
    property_count = serializers.SerializerMethodField()

    class Meta:
        model = facilities
        fields = '__all__'

    def get_property_count(self, obj):
        if hasattr(obj, 'property_count'):
            return obj.property_count
        return propertys.objects.filter(facilitie=obj).count()


class AgentSerializer(serializers.ModelSerializer):
    listing_count = serializers.SerializerMethodField()

    class Meta:
        model = egent
        fields = '__all__'

    def get_listing_count(self, obj):
        if hasattr(obj, 'listing_count'):
            return obj.listing_count
        return propertys.objects.filter(agent=obj).count()


class PropertyListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='property_types.catagorys', read_only=True)
    category_slug = serializers.CharField(source='property_types.slug', read_only=True)
    agent_name = serializers.CharField(source='agent.name', read_only=True)
    facilitie_names = serializers.SerializerMethodField()

    class Meta:
        model = propertys
        fields = [
            'id', 'property_id', 'property_title', 'slug', 'price',
            'price_amount', 'price_currency', 'property_types', 'category_name',
            'category_slug', 'agent', 'agent_name', 'facilitie', 'facilitie_names',
            'property_location', 'property_size', 'property_area', 'property_status',
            'property_floor', 'bedrooms', 'bathrooms', 'furnished',
            'property_short_discription', 'main_image',
            'slide_1', 'slide_2', 'slide_3', 'slide_4', 'slide_5', 'slide_6',
            'video_link', 'last_update',
        ]

    def get_facilitie_names(self, obj):
        return [f.facilities_name for f in obj.facilitie.all()]


class PropertyDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='property_types.catagorys', read_only=True)
    agent_name = serializers.CharField(source='agent.name', read_only=True)
    facilitie_detail = FacilitySerializer(source='facilitie', many=True, read_only=True)

    class Meta:
        model = propertys
        fields = '__all__'


class AboutSerializer(serializers.ModelSerializer):
    class Meta:
        model = about
        fields = '__all__'


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = serevices
        fields = '__all__'


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = contact
        fields = '__all__'


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = testimonial
        fields = '__all__'


class PropertyRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = property_request
        fields = '__all__'
        read_only_fields = ['created_at']


class PropertyRequestListSerializer(serializers.ModelSerializer):
    class Meta:
        model = property_request
        fields = [
            'id', 'name', 'phone_number', 'email', 'property_type',
            'goal', 'location', 'budget', 'message', 'source_page',
            'is_reviewed', 'created_at',
        ]
        read_only_fields = ['created_at']
