import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.http import QueryDict
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APITestCase

from signatureapp.models import propertys, catagory, facilities
from signatureapp.search import PropertySearch, building_types, parse_price


def _icon():
    image_data = BytesIO()
    Image.new('RGBA', (1, 1), (0, 0, 0, 0)).save(image_data, format='PNG')
    return SimpleUploadedFile('icon.png', image_data.getvalue(), content_type='image/png')


class ParsePriceTests(TestCase):
    """Tests for the parse_price utility function."""

    def test_usd_with_dollar_sign(self):
        amount, currency = parse_price("3500$")
        self.assertEqual(amount, 3500)
        self.assertEqual(currency, 'USD')

    def test_usd_explicit(self):
        amount, currency = parse_price("1500 USD")
        self.assertEqual(amount, 1500)
        self.assertEqual(currency, 'USD')

    def test_etb_birr(self):
        amount, currency = parse_price("11,000,000 Birr")
        self.assertEqual(amount, 11000000)
        self.assertEqual(currency, 'ETB')

    def test_etb_etb(self):
        amount, currency = parse_price("5,500,000 ETB")
        self.assertEqual(amount, 5500000)
        self.assertEqual(currency, 'ETB')

    def test_unparseable_returns_none(self):
        amount, currency = parse_price("1000 Per Sqm")
        self.assertIsNone(amount)
        self.assertEqual(currency, '')

    def test_negotiable_returns_none(self):
        amount, currency = parse_price("Negotiable")
        self.assertIsNone(amount)
        self.assertEqual(currency, '')

    def test_empty_string(self):
        amount, currency = parse_price("")
        self.assertIsNone(amount)
        self.assertEqual(currency, '')


class BuildingTypesTests(TestCase):
    """Tests for the building_types() helper."""

    def test_extracts_distinct_types(self):
        """After seeding categories, building_types returns distinct type names."""
        catagory.objects.create(catagorys="Apartment for Sale", slug="apt-sale", icon=_icon())
        catagory.objects.create(catagorys="Apartment for Rent", slug="apt-rent", icon=_icon())
        catagory.objects.create(catagorys="Office for Rent", slug="off-rent", icon=_icon())
        types = building_types()
        type_names = [t[1] for t in types]
        self.assertIn("Apartment", type_names)
        self.assertIn("Office", type_names)
        # "Apartment" appears only once even though two categories exist
        self.assertEqual(type_names.count("Apartment"), 1)

    def test_empty_categories(self):
        types = building_types()
        self.assertEqual(types, [])


class PropertySearchTests(TestCase):
    """Tests for the PropertySearch class."""

    @classmethod
    def setUpTestData(cls):
        # Categories (required icon ImageField satisfied via tiny PNG)
        cls.cat_apt_sale = catagory.objects.create(
            catagorys="Apartment for Sale", slug="apt-sale", icon=_icon())
        cls.cat_apt_rent = catagory.objects.create(
            catagorys="Apartment for Rent", slug="apt-rent", icon=_icon())
        cls.cat_office = catagory.objects.create(
            catagorys="Office for Rent", slug="off-rent", icon=_icon())

        # Facilities
        cls.fac_elevator = facilities.objects.create(facilities_name="Elevators", slug="elevators")
        cls.fac_parking = facilities.objects.create(facilities_name="Parking", slug="parking")
        cls.fac_security = facilities.objects.create(facilities_name="Security system", slug="security-system")

        # Properties
        cls.p1 = propertys.objects.create(
            property_title="Bole Modern Apt",
            slug="bole-modern-apt",
            property_location="Bole",
            price="3500$",
            property_status="For Rent",
            property_types=cls.cat_apt_rent,
            bedrooms="2",
            bathrooms="1",
            furnished="Yes",
            property_floor=5,
            property_size=120,
            property_area=120,
        )
        cls.p1.facilitie.add(cls.fac_elevator, cls.fac_security)

        cls.p2 = propertys.objects.create(
            property_title="Atlas Office",
            slug="atlas-office",
            property_location="Atlas",
            price="1000 Per Sqm",
            property_status="For Rent",
            property_types=cls.cat_office,
            bedrooms="0",
            bathrooms="1",
            furnished="No",
            property_floor=3,
            property_size=200,
            property_area=200,
        )
        cls.p2.facilitie.add(cls.fac_parking)

        cls.p3 = propertys.objects.create(
            property_title="CMC Luxury Apartment",
            slug="cmc-luxury-apartment",
            property_location="CMC",
            price="11,000,000 ETB",
            property_status="For Sale",
            property_types=cls.cat_apt_sale,
            bedrooms="3",
            bathrooms="2",
            furnished="Yes",
            property_floor=10,
            property_size=180,
            property_area=180,
        )

    def _search(self, **params):
        """Helper: create a PropertySearch from keyword params."""
        qd = QueryDict(mutable=True)
        for k, v in params.items():
            if isinstance(v, list):
                for item in v:
                    qd.appendlist(k, item)
            else:
                qd[k] = v
        return PropertySearch(qd)

    def test_no_filters_returns_all(self):
        results = self._search().results()
        self.assertEqual(results.count(), 3)

    def test_filter_by_location_q(self):
        results = self._search(q="bo").results()
        titles = [r.property_title for r in results]
        self.assertIn("Bole Modern Apt", titles)
        self.assertNotIn("Atlas Office", titles)

    def test_filter_by_type_apartment(self):
        results = self._search(type="apartment").results()
        titles = [r.property_title for r in results]
        self.assertIn("Bole Modern Apt", titles)
        self.assertIn("CMC Luxury Apartment", titles)
        self.assertNotIn("Atlas Office", titles)

    def test_filter_by_category_slug(self):
        results = self._search(category="apt-rent").results()
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().property_title, "Bole Modern Apt")

    def test_filter_by_status_rent(self):
        results = self._search(filter="Rent").results()
        titles = [r.property_title for r in results]
        self.assertIn("Bole Modern Apt", titles)
        self.assertIn("Atlas Office", titles)
        self.assertNotIn("CMC Luxury Apartment", titles)

    def test_filter_by_bedrooms(self):
        results = self._search(bedrooms="2").results()
        self.assertEqual(results.count(), 1)

    def test_filter_by_bathrooms(self):
        results = self._search(bathrooms="2").results()
        self.assertEqual(results.count(), 1)

    def test_filter_by_furnished(self):
        results = self._search(furnished="Yes").results()
        self.assertEqual(results.count(), 2)

    def test_filter_by_floor(self):
        results = self._search(floor="5").results()
        self.assertEqual(results.count(), 1)

    def test_filter_by_size_gte(self):
        results = self._search(size="150").results()
        titles = [r.property_title for r in results]
        self.assertIn("Atlas Office", titles)
        self.assertIn("CMC Luxury Apartment", titles)
        self.assertNotIn("Bole Modern Apt", titles)

    def test_filter_by_price_range_usd(self):
        results = self._search(currency="USD", min_price="2000", max_price="5000").results()
        titles = [r.property_title for r in results]
        self.assertIn("Bole Modern Apt", titles)
        self.assertNotIn("CMC Luxury Apartment", titles)  # ETB, not USD

    def test_filter_by_price_range_etb(self):
        results = self._search(currency="ETB", min_price="5000000", max_price="15000000").results()
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().property_title, "CMC Luxury Apartment")

    def test_filter_by_amenities_single(self):
        results = self._search(amenities=["elevators"]).results()
        titles = [r.property_title for r in results]
        self.assertIn("Bole Modern Apt", titles)

    def test_filter_by_amenities_multiple(self):
        results = self._search(amenities=["elevators", "security-system"]).results()
        # Only p1 has BOTH elevator AND security
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().property_title, "Bole Modern Apt")

    def test_filter_by_amenities_partial_match_excluded(self):
        results = self._search(amenities=["elevators", "parking"]).results()
        # No property has both elevator AND parking
        self.assertEqual(results.count(), 0)

    def test_type_plus_status_intersection(self):
        results = self._search(type="apartment", filter="Rent").results()
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().property_title, "Bole Modern Apt")

    def test_applied_filters_reflects_active(self):
        ps = self._search(bedrooms="2", furnished="Yes", amenities=["elevators"])
        af = ps.applied_filters()
        self.assertEqual(af['bedrooms'], '2')
        self.assertEqual(af['furnished'], 'Yes')
        self.assertIn('elevators', af['amenities'])

    def test_bad_input_ignored(self):
        results = self._search(bedrooms="abc", floor="xyz").results()
        # Bad input ignored — all 3 properties returned
        self.assertEqual(results.count(), 3)

    def test_category_overrides_type(self):
        results = self._search(type="apartment", category="off-rent").results()
        # category wins — returns only the office
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().property_title, "Atlas Office")


class SearchSuggestTests(TestCase):
    """Tests for the /search/suggest/ endpoint."""

    @classmethod
    def setUpTestData(cls):
        cls.cat_apt = catagory.objects.create(
            catagorys="Apartment for Sale", slug="apt-sale", icon=_icon())
        cls.cat_house = catagory.objects.create(
            catagorys="House for Rent", slug="house-rent", icon=_icon())
        cls.cat_office = catagory.objects.create(
            catagorys="Office for Rent", slug="off-rent", icon=_icon())

        propertys.objects.create(
            property_title="Bole Apt", slug="bole-apt",
            property_location="Bole", price="3500$",
            property_status="For Sale", property_types=cls.cat_apt,
            property_size=100, property_area=100, property_floor=1,
        )
        propertys.objects.create(
            property_title="Bole Subcity Apt", slug="bole-subcity-apt",
            property_location="Bole next to Boston Spa", price="5000$",
            property_status="For Sale", property_types=cls.cat_apt,
            property_size=120, property_area=120, property_floor=2,
        )
        propertys.objects.create(
            property_title="CMC House", slug="cmc-house",
            property_location="CMC", price="11,000,000 ETB",
            property_status="For Rent", property_types=cls.cat_house,
            property_size=200, property_area=200, property_floor=1,
        )

    def test_suggest_location_starts_with(self):
        resp = self.client.get('/search/suggest/', {'q': 'bo'})
        data = resp.json()
        labels = [r['label'] for r in data['results']]
        self.assertIn('Bole', labels)

    def test_suggest_groups_locations_and_types(self):
        resp = self.client.get('/search/suggest/', {'q': 'o'})
        data = resp.json()
        types = [r['type'] for r in data['results']]
        self.assertIn('location', types)
        self.assertIn('type', types)

    def test_suggest_empty_q(self):
        resp = self.client.get('/search/suggest/', {'q': ''})
        data = resp.json()
        self.assertEqual(data['results'], [])

    def test_suggest_respects_cap(self):
        resp = self.client.get('/search/suggest/', {'q': 'a'})
        data = resp.json()
        self.assertLessEqual(len(data['results']), 10)

    def test_suggest_no_match(self):
        resp = self.client.get('/search/suggest/', {'q': 'zzznonexistent'})
        data = resp.json()
        self.assertEqual(data['results'], [])


class PropertyApiMutationTests(APITestCase):
    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        self.media_override = self.settings(MEDIA_ROOT=self.media_directory.name)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.user = get_user_model().objects.create_user(
            username='property-editor-test',
            password='test-pass',
        )
        self.client.force_authenticate(self.user)
        self.category = catagory.objects.create(
            catagorys='Apartment',
            slug='property-editor-apartment',
            icon=_icon(),
        )
        self.facility = facilities.objects.create(
            facilities_name='Parking',
            slug='property-editor-parking',
        )

    def payload(self):
        return {
            'property_id': 'SPS-TEST-1',
            'property_title': 'Property Editor Test',
            'slug': 'property-editor-test',
            'price': '8,500,000 ETB',
            'property_types': self.category.id,
            'agent': '',
            'facilitie': [self.facility.id],
            'property_location': 'Bole',
            'property_size': 160,
            'property_area': 180,
            'property_status': 'For Sale',
            'property_floor': 6,
            'bedrooms': '3',
            'bathrooms': '2',
            'furnished': 'Furnished',
            'property_short_discription': 'Created through the admin property editor contract.',
            'video_link': '',
            'main_image': _icon(),
        }

    def test_create_property_with_multipart_relations_and_image(self):
        response = self.client.post('/api/properties/', self.payload(), format='multipart')

        self.assertEqual(response.status_code, 201, response.data)
        created = propertys.objects.get(slug='property-editor-test')
        self.assertEqual(created.property_types, self.category)
        self.assertEqual(list(created.facilitie.all()), [self.facility])
        self.assertTrue(created.main_image.name)

    def test_patch_without_image_preserves_existing_image(self):
        response = self.client.post('/api/properties/', self.payload(), format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        created = propertys.objects.get(slug='property-editor-test')
        original_image = created.main_image.name

        patch_response = self.client.patch(
            f'/api/properties/{created.id}/',
            {
                'property_title': 'Updated Property Editor Test',
                'agent': '',
                'facilitie': [self.facility.id],
                'video_link': '',
            },
            format='multipart',
        )

        self.assertEqual(patch_response.status_code, 200, patch_response.data)
        created.refresh_from_db()
        self.assertEqual(created.property_title, 'Updated Property Editor Test')
        self.assertEqual(created.main_image.name, original_image)

