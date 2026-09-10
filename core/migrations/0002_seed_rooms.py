from django.db import migrations

TOTAL_ROOMS = 11


def seed_rooms(apps, schema_editor):
    Room = apps.get_model("core", "Room")
    for i in range(1, TOTAL_ROOMS + 1):
        Room.objects.get_or_create(number=str(i))


def unseed_rooms(apps, schema_editor):
    Room = apps.get_model("core", "Room")
    Room.objects.filter(
        number__in=[str(i) for i in range(1, TOTAL_ROOMS + 1)]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_rooms, unseed_rooms),
    ]
