"""Merge redundant sale/rent property categories into clean property types.

The category list previously encoded the sale/rent intent (e.g. "Apartment for
Sale" and "Apartment for Rent"), which duplicates the dedicated
``property_status`` field (For Sale / For Rent). This migration folds every
"X for Sale" / "X for Rent" pair into a single "X" category, reassigns the
properties that referenced the duplicate, and deletes the duplicates.

The reverse recreates the "X for Sale" / "X for Rent" split using each
property's ``property_status`` so a code-only rollback to the previous commit
(old ``search.py`` that rebuilds "Apartment for Sale" strings) keeps working.

Safe to run on any state: categories whose name does not map to one of the
known types are left untouched, and the migration is a no-op when no
matchable categories exist (e.g. an empty database during test setup).
"""

from django.db import migrations

# Maps a known property-type keyword to the clean category label and slug.
CANONICAL_TYPES = (
    ("apartment", "Apartment"),
    ("building", "Building"),
    ("warehouse", "Warehouse"),
    ("house", "House"),
    ("office", "Office"),
    ("land", "Land"),
)


def _canonical_for(name):
    """Return (keyword, label) for a category name, or (None, None)."""
    lower = (name or "").strip().lower()
    if not lower:
        return None, None
    for keyword, label in CANONICAL_TYPES:
        if lower.startswith(keyword):
            return keyword, label
    return None, None


def merge_categories(apps, schema_editor):
    catagory = apps.get_model("signatureapp", "catagory")
    propertys = apps.get_model("signatureapp", "propertys")

    grouped = {}
    for category in catagory.objects.all():
        keyword, label = _canonical_for(category.catagorys)
        if not keyword:
            continue
        grouped.setdefault(keyword, {"label": label, "rows": []})["rows"].append(category)

    for keyword, group in grouped.items():
        rows = sorted(group["rows"], key=lambda c: c.id)
        keeper = rows[0]
        siblings = rows[1:]

        for sibling in siblings:
            propertys.objects.filter(property_types=sibling).update(property_types=keeper)

        for sibling in siblings:
            sibling.delete()

        keeper.catagorys = group["label"]
        keeper.slug = keyword
        keeper.save(update_fields=["catagorys", "slug"])


def reverse_merge(apps, schema_editor):
    """Restore the "X for Sale" / "X for Rent" split removed by merge_categories.

    For every canonical category produced by the forward migration, this
    renames the keeper to the sale variant, recreates the rent variant, and
    reassigns each property to the variant matching its ``property_status``.
    This lets a code-only rollback to the previous commit (whose
    ``search.py._filter_type_or_category`` rebuilds "Apartment for Sale"
    strings) keep functioning.
    """
    catagory = apps.get_model("signatureapp", "catagory")
    propertys = apps.get_model("signatureapp", "propertys")

    for keyword, label in CANONICAL_TYPES:
        canonical = catagory.objects.filter(catagorys__iexact=label).first()
        if not canonical:
            continue

        sale_name = f"{label} for Sale"
        rent_name = f"{label} for Rent"
        sale_slug = f"{keyword}-for-sale"
        rent_slug = f"{keyword}-for-rent"
        icon_name = canonical.icon.name if canonical.icon else ""

        # Rename the keeper to the sale variant.
        canonical.catagorys = sale_name
        canonical.slug = sale_slug
        canonical.save(update_fields=["catagorys", "slug"])

        # Recreate or reclaim the rent variant.
        rent_cat, created = catagory.objects.get_or_create(
            slug=rent_slug,
            defaults={"catagorys": rent_name},
        )
        if not created and rent_cat.catagorys != rent_name:
            rent_cat.catagorys = rent_name
            rent_cat.save(update_fields=["catagorys"])
        if created and icon_name:
            rent_cat.icon = icon_name
            rent_cat.save(update_fields=["icon"])

        # Move rent properties to the rent variant; sale properties stay put.
        propertys.objects.filter(
            property_types=canonical, property_status="For Rent"
        ).update(property_types=rent_cat)


class Migration(migrations.Migration):

    dependencies = [
        ("signatureapp", "0028_update_agent_ordering"),
    ]

    operations = [
        migrations.RunPython(merge_categories, reverse_code=reverse_merge),
    ]
