# Generated by Django 4.1.5 on 2023-08-07 10:55

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("osrd_infra", "0044_rename_is_pantograph_drop_zone_to_lower_pantograph"),
    ]

    operations = [
        migrations.AlterField(
            model_name="infra",
            name="railjson_version",
            field=models.CharField(default="3.4.0", editable=False, max_length=16),
        ),
        migrations.RunSQL(
            sql=[("UPDATE osrd_infra_infra SET railjson_version = '3.4.0'")],
            reverse_sql=[("UPDATE osrd_infra_infra SET railjson_version = '3.3.1'")],
        ),
    ]
