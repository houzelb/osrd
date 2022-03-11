# Generated by Django 3.2.9 on 2022-03-11 09:13

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('osrd_infra', '0008_add_generated_tables'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='infra',
            name='created',
        ),
        migrations.RemoveField(
            model_name='infra',
            name='modified',
        ),
        migrations.AddField(
            model_name='infra',
            name='version',
            field=models.PositiveBigIntegerField(default=1, editable=False),
        ),
        migrations.AlterField(
            model_name='infra',
            name='railjson_version',
            field=models.CharField(default='2.2.0', editable=False, max_length=16),
        ),
        migrations.CreateModel(
            name='GeneratedInfra',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version', models.PositiveBigIntegerField(default=0, editable=False)),
                ('infra', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='generated', to='osrd_infra.infra')),
            ],
        ),
    ]
