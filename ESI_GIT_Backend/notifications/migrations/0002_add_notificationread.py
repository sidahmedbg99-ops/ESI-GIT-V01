import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationRead',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                ('recipient_type', models.CharField(max_length=10)),
                ('recipient_id', models.BigIntegerField()),
                ('notification', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reads',
                    to='notifications.notification',
                )),
            ],
            options={
                'db_table': 'notification_reads',
            },
        ),
        migrations.AlterUniqueTogether(
            name='notificationread',
            unique_together={('notification', 'recipient_type', 'recipient_id')},
        ),
    ]
