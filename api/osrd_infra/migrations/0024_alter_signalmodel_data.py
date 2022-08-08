# Generated by Django 4.0.6 on 2022-08-08 12:50

from django.db import migrations, models
import osrd_infra.utils


class Migration(migrations.Migration):

    dependencies = [
        ('osrd_infra', '0023_alter_operational_points'),
    ]

    operations = [
        migrations.AlterField(
            model_name='signalmodel',
            name='data',
            field=models.JSONField(validators=[osrd_infra.utils.JSONSchemaValidator(limit_value={'definitions': {'Direction': {'description': 'An enumeration.', 'enum': ['START_TO_STOP', 'STOP_TO_START'], 'title': 'Direction', 'type': 'string'}, 'ObjectReference': {'properties': {'id': {'maxLength': 255, 'title': 'Id', 'type': 'string'}, 'type': {'title': 'Type', 'type': 'string'}}, 'required': ['id', 'type'], 'title': 'ObjectReference', 'type': 'object'}, 'Side': {'description': 'An enumeration.', 'enum': ['LEFT', 'RIGHT', 'CENTER'], 'title': 'Side', 'type': 'string'}}, 'properties': {'angle_geo': {'default': 0, 'description': 'Geographic angle in degrees', 'title': 'Angle Geo', 'type': 'number'}, 'angle_sch': {'default': 0, 'description': 'Schematic angle in degrees', 'title': 'Angle Sch', 'type': 'number'}, 'aspects': {'items': {'type': 'string'}, 'title': 'Aspects', 'type': 'array'}, 'comment': {'title': 'Comment', 'type': 'string'}, 'default_aspect': {'description': 'Name of the aspect displayed when no train is around', 'title': 'Default Aspect', 'type': 'string'}, 'default_aspect_color': {'description': 'Color of the default aspect', 'title': 'Default Aspect Color', 'type': 'integer'}, 'direction': {'$ref': '#/definitions/Direction'}, 'id': {'maxLength': 255, 'title': 'Id', 'type': 'string'}, 'installation_type': {'title': 'Installation Type', 'type': 'string'}, 'is_in_service': {'title': 'Is In Service', 'type': 'boolean'}, 'is_lightable': {'title': 'Is Lightable', 'type': 'boolean'}, 'is_operational': {'title': 'Is Operational', 'type': 'boolean'}, 'label': {'title': 'Label', 'type': 'string'}, 'linked_detector': {'$ref': '#/definitions/ObjectReference'}, 'physical_organization_group': {'title': 'Physical Organization Group', 'type': 'string'}, 'position': {'title': 'Position', 'type': 'number'}, 'responsible_group': {'title': 'Responsible Group', 'type': 'string'}, 'side': {'allOf': [{'$ref': '#/definitions/Side'}], 'default': 'CENTER', 'description': 'Side of the signal on the track'}, 'sight_distance': {'title': 'Sight Distance', 'type': 'number'}, 'support_type': {'title': 'Support Type', 'type': 'string'}, 'track': {'$ref': '#/definitions/ObjectReference'}, 'type_code': {'title': 'Type Code', 'type': 'string'}, 'value': {'title': 'Value', 'type': 'string'}}, 'required': ['track', 'position', 'id', 'direction', 'sight_distance'], 'title': 'Signal', 'type': 'object'})]),
        ),
    ]
