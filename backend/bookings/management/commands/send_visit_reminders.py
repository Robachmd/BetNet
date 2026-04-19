from django.core.management.base import BaseCommand

from notifications.services import send_visit_day_reminders


class Command(BaseCommand):
    help = (
        "Send in-app (and email/SMS) visit reminders for bookings due today. "
        "Schedule daily via cron or Task Scheduler."
    )

    def handle(self, *args, **options):
        send_visit_day_reminders()
        self.stdout.write(self.style.SUCCESS("Visit reminders processed."))
