import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('signatureapp', '0026_alter_egent_options_propertys_price_amount_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='propertys',
            name='agent',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to='signatureapp.egent',
            ),
        ),
        migrations.AlterField(
            model_name='propertys',
            name='property_types',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to='signatureapp.catagory',
            ),
        ),
    ]
