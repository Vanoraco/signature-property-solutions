from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db import transaction
from signatureapp.models import (
    home, catagory, facilities, egent, propertys,
    about, serevices, contact, testimonial, property_request,
    ActivityLogEntry, SearchEvent,
    servicespage, servicespage_why_item, servicespage_process_step,
    AboutIntroParagraph, AboutValueItem, AboutWhyItem,
    AboutCommitmentParagraph, ServicesPageService,
    ServicesPageServiceParagraph, ServicesPageServiceTagGroup,
    ServicesPageServiceTagItem,
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


def _upsert_child(manager, item, match_field=None):
    data = dict(item)
    item_id = data.pop('id', None)
    child = manager.filter(id=item_id).first() if item_id else None

    if child is None and match_field:
        match_value = data.get(match_field)
        if match_value not in (None, ''):
            child = manager.filter(**{match_field: match_value}).first()

    if child is None:
        return manager.create(**data)

    for field, value in data.items():
        setattr(child, field, value)
    child.save()
    return child


def _sync_children(manager, items, match_field=None, owned_prefix=None):
    normalized_items = []
    for index, item in enumerate(items):
        data = dict(item)
        if owned_prefix:
            key = (data.get('key') or f'item-{index + 1}').strip()
            if not key.startswith(owned_prefix):
                key = f'{owned_prefix}{key}'
            data['key'] = key[:100].rstrip('-')
        normalized_items.append(data)

    kept_ids = [
        _upsert_child(manager, item, match_field=match_field).id
        for item in normalized_items
    ]
    stale = manager.exclude(id__in=kept_ids)
    if owned_prefix:
        stale = stale.filter(key__startswith=owned_prefix)
    stale.delete()


class AboutIntroParagraphSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = AboutIntroParagraph
        fields = ['id', 'key', 'text', 'order']


class AboutValueItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = AboutValueItem
        fields = ['id', 'key', 'tag', 'text', 'order']


class AboutWhyItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = AboutWhyItem
        fields = ['id', 'key', 'title', 'text', 'order']


class AboutCommitmentParagraphSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = AboutCommitmentParagraph
        fields = ['id', 'key', 'text', 'order']


class AboutSerializer(serializers.ModelSerializer):
    intro_paragraphs = AboutIntroParagraphSerializer(many=True, required=False)
    value_items = AboutValueItemSerializer(many=True, required=False)
    why_items = AboutWhyItemSerializer(many=True, required=False)
    commitment_paragraphs = AboutCommitmentParagraphSerializer(many=True, required=False)
    clear_images = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False,
    )

    IMAGE_FIELDS = {
        'image', 'aboutus_image', 'vision_image',
        'mission_image', 'value_image', 'ceo_image',
    }

    class Meta:
        model = about
        fields = '__all__'
        extra_kwargs = {
            'image': {'required': False, 'allow_null': True},
        }

    @transaction.atomic
    def create(self, validated_data):
        nested = {
            name: validated_data.pop(name, [])
            for name in (
                'intro_paragraphs', 'value_items', 'why_items',
                'commitment_paragraphs',
            )
        }
        validated_data.pop('clear_images', None)
        page = super().create(validated_data)
        for name, items in nested.items():
            _sync_children(getattr(page, name), items, match_field='key')
        return page

    @transaction.atomic
    def update(self, instance, validated_data):
        nested = {
            name: validated_data.pop(name, None)
            for name in (
                'intro_paragraphs', 'value_items', 'why_items',
                'commitment_paragraphs',
            )
        }
        clear = [name for name in validated_data.pop('clear_images', []) if name in self.IMAGE_FIELDS]
        instance = super().update(instance, validated_data)
        for name in clear:
            field_file = getattr(instance, name)
            if field_file:
                field_file.delete(save=False)
        if clear:
            instance.save()
        for name, items in nested.items():
            if items is not None:
                _sync_children(getattr(instance, name), items, match_field='key')
        return instance


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = serevices
        fields = '__all__'


class ServicesPageWhyItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = servicespage_why_item
        fields = ['id', 'key', 'title', 'text', 'order']


class ServicesPageProcessStepSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = servicespage_process_step
        fields = ['id', 'key', 'title', 'text', 'order']


class ServicesPageServiceParagraphSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = ServicesPageServiceParagraph
        fields = ['id', 'key', 'text', 'order']


class ServicesPageServiceTagItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = ServicesPageServiceTagItem
        fields = ['id', 'key', 'text', 'order']


class ServicesPageServiceTagGroupSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    items = ServicesPageServiceTagItemSerializer(many=True, required=False)

    class Meta:
        model = ServicesPageServiceTagGroup
        fields = ['id', 'key', 'title', 'order', 'items']


class ServicesPageServiceSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    paragraphs = ServicesPageServiceParagraphSerializer(many=True, required=False)
    tag_groups = ServicesPageServiceTagGroupSerializer(many=True, required=False)

    class Meta:
        model = ServicesPageService
        fields = [
            'id', 'key', 'tag', 'title', 'tagline', 'order',
            'paragraphs', 'tag_groups',
        ]


class ServicesPageSerializer(serializers.ModelSerializer):
    why_items = ServicesPageWhyItemSerializer(many=True, required=False)
    process_steps = ServicesPageProcessStepSerializer(many=True, required=False)
    service_items = ServicesPageServiceSerializer(many=True, required=False)
    clear_images = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False,
    )

    IMAGE_FIELDS = {'hero_image'}

    class Meta:
        model = servicespage
        fields = [
            'id', 'hero_eyebrow', 'hero_title', 'hero_lead', 'hero_image', 'intro',
            'why_choose_title', 'process_title', 'why_items', 'process_steps',
            'service_items', 'clear_images',
        ]

    @transaction.atomic
    def create(self, validated_data):
        why_items = validated_data.pop('why_items', [])
        process_steps = validated_data.pop('process_steps', [])
        service_items = validated_data.pop('service_items', [])
        validated_data.pop('clear_images', None)
        page = servicespage.objects.create(**validated_data)
        _sync_children(page.why_items, why_items, match_field='key', owned_prefix='reference-')
        _sync_children(page.process_steps, process_steps, match_field='key', owned_prefix='reference-')
        self._sync_service_items(page.service_items, service_items)
        return page

    @transaction.atomic
    def update(self, instance, validated_data):
        why_items = validated_data.pop('why_items', None)
        process_steps = validated_data.pop('process_steps', None)
        service_items = validated_data.pop('service_items', None)
        clear = [name for name in validated_data.pop('clear_images', []) if name in self.IMAGE_FIELDS]
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        for name in clear:
            field_file = getattr(instance, name)
            if field_file:
                field_file.delete(save=False)
        instance.save()
        if why_items is not None:
            _sync_children(instance.why_items, why_items, match_field='key', owned_prefix='reference-')
        if process_steps is not None:
            _sync_children(instance.process_steps, process_steps, match_field='key', owned_prefix='reference-')
        if service_items is not None:
            self._sync_service_items(instance.service_items, service_items)
        return instance

    def _sync_service_items(self, manager, items):
        kept_ids = []
        for item in items:
            data = dict(item)
            paragraphs = data.pop('paragraphs', None)
            tag_groups = data.pop('tag_groups', None)
            service = _upsert_child(manager, data, match_field='key')

            if paragraphs is not None:
                _sync_children(service.paragraphs, paragraphs, match_field='key')
            if tag_groups is not None:
                self._sync_tag_groups(service.tag_groups, tag_groups)
            kept_ids.append(service.id)
        manager.exclude(id__in=kept_ids).delete()

    def _sync_tag_groups(self, manager, groups):
        kept_ids = []
        for group_data in groups:
            data = dict(group_data)
            items = data.pop('items', None)
            group = _upsert_child(manager, data, match_field='key')
            if items is not None:
                _sync_children(group.items, items, match_field='key')
            kept_ids.append(group.id)
        manager.exclude(id__in=kept_ids).delete()


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


class SearchEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchEvent
        fields = [
            'id', 'query', 'source', 'location_filter',
            'property_type', 'status_filter', 'results_count',
            'pathway', 'created_at',
        ]
        read_only_fields = fields
