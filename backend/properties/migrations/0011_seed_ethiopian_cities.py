# Generated manually for City seed + Location.city_ref backfill

from django.db import migrations
from django.utils.text import slugify


def _unique_slug(City, name):
    base = (slugify(name) or "city")[:120]
    slug = base
    n = 1
    while City.objects.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


def seed_cities_and_backfill(apps, schema_editor):
    from properties.ethiopian_cities import ETHIOPIAN_CITIES_SEED

    City = apps.get_model("properties", "City")
    Location = apps.get_model("properties", "Location")

    for row in ETHIOPIAN_CITIES_SEED:
        name = row["name"]
        if City.objects.filter(name=name).exists():
            continue
        slug = _unique_slug(City, name)
        City.objects.create(
            name=name,
            slug=slug,
            region=row.get("region", ""),
            sort_order=row.get("sort_order", 100),
            search_text=row.get("search_text", ""),
            is_active=True,
        )

    for loc in Location.objects.exclude(city="").iterator():
        c = City.objects.filter(name__iexact=loc.city.strip()).first()
        if c and loc.city_ref_id is None:
            Location.objects.filter(pk=loc.pk).update(city_ref_id=c.pk)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0010_add_city_model"),
    ]

    operations = [
        migrations.RunPython(seed_cities_and_backfill, noop_reverse),
    ]
