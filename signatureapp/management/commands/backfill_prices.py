from django.core.management.base import BaseCommand
from signatureapp.models import propertys


class Command(BaseCommand):
    help = 'Backfill price_amount and price_currency from existing price text'

    def handle(self, *args, **options):
        qs = propertys.objects.all()
        total = qs.count()
        updated = 0
        unchanged = 0

        for p in qs:
            had_amount = p.price_amount
            p.save()  # triggers _parse_price() in model
            if p.price_amount != had_amount:
                updated += 1
            else:
                unchanged += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Backfill complete: {updated} updated, {unchanged} unchanged, {total} total'
            )
        )
