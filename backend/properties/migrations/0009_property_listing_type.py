from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0008_hall_capacity_min"),
    ]

    operations = [
        migrations.AddField(
            model_name="property",
            name="listing_type",
            field=models.CharField(
                choices=[
                    ("rent", "For rent"),
                    ("sale", "For sale"),
                    ("short_term", "Short-term rental"),
                ],
                db_index=True,
                default="rent",
                help_text="Whether the owner is offering the property for rent, sale, or short-term rent.",
                max_length=12,
            ),
        ),
    ]
