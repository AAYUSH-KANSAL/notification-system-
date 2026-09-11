from django.core.management.base import BaseCommand
from notifications.seed_data import run_seed

class Command(BaseCommand):
    help = "Seeds database with default triggers, templates, and demonstration users"

    def handle(self, *args, **options):
        run_seed()
        self.stdout.write(self.style.SUCCESS("Successfully seeded notification system database."))
