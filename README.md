# Signature Property Solutions

A real estate web application built with Django for listing and managing properties in Ethiopia.

**Live site:** [ethiosps.com](https://ethiosps.com)

## Requirements

- Python 3.12 (Django 5.0.4 does not support Python 3.13+)
- pip

## Setup

1. **Clone the repository**

```bash
git clone https://github.com/Vanoraco/signature-property-solutions.git
cd signature-property-solutions
```

2. **Create a virtual environment using Python 3.12**

```bash
# Windows (if multiple Python versions installed)
py -3.12 -m venv env

# macOS / Linux
python3.12 -m venv env
```

3. **Activate the virtual environment**

```bash
# Windows
env\Scripts\activate

# macOS / Linux
source env/bin/activate
```

4. **Install dependencies**

```bash
pip install django==5.0.4
pip install -r requirements.txt
```

5. **Run migrations**

```bash
python manage.py makemigrations
python manage.py migrate
```

6. **Create a superuser** (to access the admin panel)

```bash
python manage.py createsuperuser
```

7. **Run the development server**

```bash
python manage.py runserver
```

The app will be available at [http://localhost:8000](http://localhost:8000).

## Admin Panel

Go to [http://localhost:8000/admin](http://localhost:8000/admin) and log in with your superuser credentials to add:

- **Home** — hero section content
- **Categories** — property types (e.g. Apartment for Sale, Office for Rent)
- **Properties** — property listings with images, price, location, facilities
- **Services** — company services
- **About** — company info, vision, mission
- **Contact** — address, phone, email, social links, Google Maps embed
- **Agents** — agent profiles

## Tech Stack

- Django 5.0.4
- SQLite
- Bootstrap 5
- Font Awesome 6
- django-ckeditor (rich text editing)
- Pillow (image handling)
- django-multiselectfield
