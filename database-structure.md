# Database Structure

## 1. home (Home Information)

| Field | Type | Details |
|-------|------|---------|
| id | AutoField | Primary key |
| image | ImageField | upload_to='home info', blank=True |
| slogon | CharField | max_length=600, blank=True |
| title | CharField | max_length=600, blank=True |
| video | FileField | upload_to='videos_uploaded', null=True |

---

## 2. catagory (Category)

| Field | Type | Details |
|-------|------|---------|
| id | AutoField | Primary key |
| catagorys | CharField | max_length=600, blank=True |
| slug | SlugField | unique=True, blank=True |
| icon | ImageField | upload_to='catagory' |

---

## 3. facilities (Facilities List)

| Field | Type | Details |
|-------|------|---------|
| id | AutoField | Primary key |
| facilities_name | CharField | max_length=600, blank=True |
| slug | SlugField | unique=True, blank=True |

---

## 4. egent (Agent)

| Field | Type | Details |
|-------|------|---------|
| id | AutoField | Primary key |
| name | CharField | max_length=600, blank=True |
| image | ImageField | upload_to='home info', blank=True |
| phone_number | CharField | max_length=600, blank=True |
| office_phone | CharField | max_length=600, blank=True |
| email | CharField | max_length=600, blank=True |
| facebook | CharField | max_length=600, blank=True |
| instagram | CharField | max_length=600, blank=True |
| linkden | CharField | max_length=600, blank=True |

---

## 5. propertys (Property Listings)

| Field | Type | Details |
|-------|------|---------|
| id | AutoField | Primary key |
| property_id | CharField | max_length=20, unique=True, null=True |
| property_title | CharField | max_length=600, blank=True |
| slug | SlugField | unique=True |
| price | CharField | max_length=100, blank=True |
| property_types | ForeignKey | → catagory (CASCADE) |
| agent | ForeignKey | → egent (CASCADE), blank=True, null=True |
| facilitie | ManyToManyField | → facilities |
| property_location | CharField | max_length=100, blank=True |
| property_size | IntegerField | required |
| property_area | IntegerField | required |
| property_status | CharField | max_length=100, choices: For Sale, For Rent |
| property_floor | IntegerField | required |
| bedrooms | CharField | max_length=100, blank=True |
| bathrooms | CharField | max_length=100, blank=True |
| furnished | CharField | max_length=100, blank=True |
| property_short_discription | TextField | blank=True |
| main_image | ImageField | upload_to='products', blank=True |
| slide_1 | ImageField | upload_to='products', blank=True |
| slide_2 | ImageField | upload_to='products', blank=True |
| slide_3 | ImageField | upload_to='products', blank=True |
| slide_4 | ImageField | upload_to='products', blank=True |
| slide_5 | ImageField | upload_to='products', blank=True |
| slide_6 | ImageField | upload_to='products', blank=True |
| video_link | URLField | max_length=600, blank=True |
| last_update | DateTimeField | auto_now=True |

---

## 6. about (About Us)

| Field | Type | Details |
|-------|------|---------|
| id | AutoField | Primary key |
| image | ImageField | upload_to='about' |
| hading | CharField | max_length=600, blank=True |
| title | CharField | max_length=600, blank=True |
| aboutus | RichTextField | blank=True |
| aboutus_image | ImageField | upload_to='about', blank=True |
| vision | RichTextField | blank=True |
| vision_image | ImageField | upload_to='about', blank=True |
| mission | RichTextField | blank=True |
| mission_image | ImageField | upload_to='about', blank=True |
| value | RichTextField | blank=True |
| value_image | ImageField | upload_to='about', blank=True |
| why_choose_us_header | CharField | max_length=600, blank=True |
| tytle | CharField | max_length=600, blank=True |
| description | RichTextField | blank=True |
| ceo_image | ImageField | upload_to='about', blank=True |
| ceo_name | CharField | max_length=600, blank=True |
| ceo_position | CharField | max_length=600, blank=True |
| ceo_description | RichTextField | required |
| ceo_facebook | CharField | max_length=600, blank=True |
| ceo_twitter | CharField | max_length=600, blank=True |
| ceo_linkden | CharField | max_length=600, blank=True |

---

## 7. serevices (Services)

| Field | Type | Details |
|-------|------|---------|
| id | AutoField | Primary key |
| icon | ImageField | upload_to='partners' |
| service_name | CharField | max_length=600, blank=True |
| slug | SlugField | unique=True, blank=True |
| short_discriptions | RichTextField | required |
| Discription | RichTextField | required |
| image | ImageField | upload_to='partners', blank=True |

---

## 8. contact (Contact Us)

| Field | Type | Details |
|-------|------|---------|
| id | AutoField | Primary key |
| google_map | CharField | max_length=600, blank=True |
| phone_number | CharField | max_length=600, blank=True |
| office_phone | CharField | max_length=600, blank=True |
| email | CharField | max_length=600, blank=True |
| website | CharField | max_length=600, blank=True |
| address | CharField | max_length=600, blank=True |
| facebook | CharField | max_length=600, blank=True |
| instagram | CharField | max_length=600, blank=True |
| linkden | CharField | max_length=600, blank=True |

---

## 9. testimonial (Testimonials)

| Field | Type | Details |
|-------|------|---------|
| id | AutoField | Primary key |
| name | CharField | max_length=200 |
| role | CharField | max_length=200, blank=True |
| location | CharField | max_length=200, blank=True |
| quote | TextField | required |
| image | ImageField | upload_to='testimonials', blank=True |
| rating | PositiveSmallIntegerField | choices: 1-5, default=5 |
| is_published | BooleanField | default=True |
| created_at | DateTimeField | auto_now_add=True |

---

## 10. property_request (Property Requests)

| Field | Type | Details |
|-------|------|---------|
| id | AutoField | Primary key |
| name | CharField | max_length=200, blank=True |
| phone_number | CharField | max_length=100, blank=True |
| email | EmailField | blank=True |
| property_type | CharField | max_length=200, blank=True |
| goal | CharField | max_length=50, choices: Rent, Buy, Invest, Other |
| location | CharField | max_length=200, blank=True |
| budget | CharField | max_length=200, blank=True |
| message | TextField | required |
| source_page | CharField | max_length=600, blank=True |
| is_reviewed | BooleanField | default=False |
| created_at | DateTimeField | auto_now_add=True |

---

## Relationships

- `propertys.property_types` → `catagory.id` (many-to-one)
- `propertys.agent` → `egent.id` (many-to-one, optional)
- `propertys.facilitie` ↔ `facilities.id` (many-to-many)
