# Generated manually for property_types JSON + only_available_listings

from django.db import migrations, models


def forwards_copy_property_types(apps, schema_editor):
    LocationAlert = apps.get_model("notifications", "LocationAlert")
    for row in LocationAlert.objects.all():
        raw = getattr(row, "property_type", None)
        s = str(raw).strip() if raw is not None else ""
        row.property_types = [s.upper()] if s else []
        row.save(update_fields=["property_types"])


def backwards_restore_single_type(apps, schema_editor):
    LocationAlert = apps.get_model("notifications", "LocationAlert")
    for row in LocationAlert.objects.all():
        types = getattr(row, "property_types", None) or []
        if types:
            row.property_type = str(types[0]).strip().upper()[:20]
        else:
            row.property_type = ""
        row.save(update_fields=["property_type"])


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0004_location_alert_property_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="locationalert",
            name="property_types",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Optional filters: list of Property.property_type values, e.g. ["APARTMENT","CONDOMINIUM"]. Empty means any type.',
            ),
        ),
        migrations.AddField(
            model_name="locationalert",
            name="only_available_listings",
            field=models.BooleanField(
                default=True,
                help_text="If True, do not notify when the listing is unavailable or booked out (is_available=False).",
            ),
        ),
        migrations.RunPython(forwards_copy_property_types, backwards_restore_single_type),
        migrations.RemoveField(
            model_name="locationalert",
            name="property_type",
        ),
    ]
