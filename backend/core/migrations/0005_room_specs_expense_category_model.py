from django.db import migrations, models


DEFAULT_CATEGORIES = [
    ("Labor", True, False),
    ("Materials", False, True),
    ("Utilities", False, False),
    ("Maintenance", False, False),
    ("Other", False, False),
]


def seed_expense_categories(apps, schema_editor):
    ExpenseCategory = apps.get_model("core", "ExpenseCategory")
    for name, tracks_worker_count, tracks_materials in DEFAULT_CATEGORIES:
        ExpenseCategory.objects.get_or_create(
            name=name,
            defaults={
                "tracks_worker_count": tracks_worker_count,
                "tracks_materials": tracks_materials,
            },
        )


def unseed_expense_categories(apps, schema_editor):
    ExpenseCategory = apps.get_model("core", "ExpenseCategory")
    ExpenseCategory.objects.filter(
        name__in=[name for name, _, _ in DEFAULT_CATEGORIES]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_companion"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExpenseCategory",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100, unique=True)),
                ("tracks_worker_count", models.BooleanField(default=False)),
                ("tracks_materials", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name_plural": "expense categories",
                "ordering": ["name"],
            },
        ),
        migrations.RunPython(seed_expense_categories, unseed_expense_categories),
        migrations.AddField(
            model_name="room",
            name="amenities",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="room",
            name="bed_type",
            field=models.CharField(
                choices=[
                    ("SINGLE", "Single"),
                    ("DOUBLE", "Double"),
                    ("TWIN", "Twin"),
                    ("QUEEN", "Queen"),
                    ("KING", "King"),
                ],
                default="DOUBLE",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="room",
            name="extra_bed_allowed",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="room",
            name="extra_bed_charge",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=10, null=True
            ),
        ),
        migrations.AddField(
            model_name="room",
            name="max_occupancy",
            field=models.PositiveIntegerField(default=2),
        ),
        migrations.AlterField(
            model_name="payment",
            name="payment_method",
            field=models.CharField(
                choices=[("CASH", "Cash"), ("UPI", "UPI"), ("CARD", "Card")],
                max_length=20,
            ),
        ),
    ]
