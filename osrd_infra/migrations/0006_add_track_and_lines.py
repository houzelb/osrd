# Generated by Django 3.1.7 on 2021-04-30 15:38

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('osrd_infra', '0005_add_track_angle'),
    ]

    operations = [
        migrations.CreateModel(
            name='LineEntity',
            fields=[
            ],
            options={
                'verbose_name_plural': 'lines',
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=('osrd_infra.entity',),
        ),
        migrations.CreateModel(
            name='TrackEntity',
            fields=[
            ],
            options={
                'verbose_name_plural': 'tracks',
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=('osrd_infra.entity',),
        ),
        migrations.CreateModel(
            name='BelongsToTrackComponent',
            fields=[
                ('component_id', models.BigAutoField(primary_key=True, serialize=False)),
                ('entity', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='belong_to_track_set', to='osrd_infra.entity')),
                ('track', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='track_components', to='osrd_infra.trackentity')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='BelongsToLineComponent',
            fields=[
                ('component_id', models.BigAutoField(primary_key=True, serialize=False)),
                ('entity', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='belong_to_line_set', to='osrd_infra.entity')),
                ('line', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='line_components', to='osrd_infra.lineentity')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
