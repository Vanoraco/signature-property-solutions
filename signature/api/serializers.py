from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from signatureapp.models import (
    home, catagory, facilities, egent, propertys,
    about, serevices, contact, testimonial, property_request,
    ActivityLogEntry,
)


User = get_user_model()


class PermissionSerializer(serializers.ModelSerializer):
    model = serializers.CharField(source='content_type.model', read_only=True)
    app_label = serializers.CharField(source='content_type.app_label', read_only=True)

    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'model', 'app_label']


class GroupSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    permissions = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.select_related('content_type').all(),
        many=True,
        required=False,
    )
    permission_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'user_count', 'permissions', 'permission_details']

    def get_user_count(self, obj):
        return obj.user_set.count()

    def get_permission_details(self, obj):
        return [
            {
                'id': p.id,
                'name': p.name,
                'codename': p.codename,
                'model': p.content_type.model,
                'app_label': p.content_type.app_label,
            }
            for p in obj.permissions.select_related('content_type').all()
        ]


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    groups = serializers.PrimaryKeyRelatedField(queryset=Group.objects.all(), many=True, required=False)
    group_names = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'is_superuser', 'groups', 'group_names',
            'password', 'date_joined', 'last_login',
        ]
        read_only_fields = ['date_joined', 'last_login']

    def get_group_names(self, obj):
        return [g.name for g in obj.groups.all()]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        groups = validated_data.pop('groups', [])
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        if groups:
            user.groups.set(groups)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        groups = validated_data.pop('groups', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if groups is not None:
            instance.groups.set(groups)
        return instance


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


class ActivityLogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLogEntry
        fields = [
            'id', 'actor', 'actor_username', 'action',
            'target_model', 'target_id', 'target_label',
            'summary', 'created_at',
        ]
        read_only_fields = fields
