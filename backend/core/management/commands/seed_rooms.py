from django.core.management.base import BaseCommand

from core.models import Room

TOTAL_ROOMS = 11


class Command(BaseCommand):
    help = f"Seed the {TOTAL_ROOMS} lodge rooms (numbered 1 to {TOTAL_ROOMS})."

    def handle(self, *args, **options):
        created_count = 0
        for i in range(1, TOTAL_ROOMS + 1):
            room, created = Room.objects.get_or_create(number=str(i))
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeding complete. Created {created_count} new room(s). "
                f"Total rooms in database: {Room.objects.count()}."
            )
        )
