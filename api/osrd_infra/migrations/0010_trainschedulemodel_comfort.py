# Generated by Django 4.0.8 on 2022-11-10 14:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('osrd_infra', '0009_rolling_stocks_v3_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='trainschedulemodel',
            name='comfort',
            field=models.CharField(default='standard', max_length=8),
        ),
    ]
