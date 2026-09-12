import django.db.models.deletion
from django.db import migrations, models

CATEGORY_NAME_BY_OLD_VALUE = {
    "LABOR": "Labor",
    "MATERIALS": "Materials",
    "UTILITIES": "Utilities",
    "MAINTENANCE": "Maintenance",
    "OTHER": "Other",
}


def migrate_category_strings_to_fk(apps, schema_editor):
    Expense = apps.get_model("core", "Expense")
    ExpenseCategory = apps.get_model("core", "ExpenseCategory")

    category_id_by_name = dict(
        ExpenseCategory.objects.values_list("name", "id")
    )

    for expense in Expense.objects.all():
        category_name = CATEGORY_NAME_BY_OLD_VALUE.get(
            expense.category_old, "Other"
        )
        Expense.objects.filter(pk=expense.pk).update(
            category_new_id=category_id_by_name[category_name]
        )


def reverse_migrate_fk_to_strings(apps, schema_editor):
    Expense = apps.get_model("core", "Expense")
    old_value_by_category_name = {
        v: k for k, v in CATEGORY_NAME_BY_OLD_VALUE.items()
    }
    for expense in Expense.objects.select_related("category_new").all():
        old_value = old_value_by_category_name.get(
            expense.category_new.name, "OTHER"
        )
        Expense.objects.filter(pk=expense.pk).update(category_old=old_value)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_room_specs_expense_category_model"),
    ]

    operations = [
        migrations.RenameField(
            model_name="expense",
            old_name="category",
            new_name="category_old",
        ),
        migrations.AddField(
            model_name="expense",
            name="category_new",
            field=models.ForeignKey(
                to="core.expensecategory",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="expenses_new",
                null=True,
            ),
        ),
        migrations.RunPython(
            migrate_category_strings_to_fk, reverse_migrate_fk_to_strings
        ),
        migrations.RemoveField(
            model_name="expense",
            name="category_old",
        ),
        migrations.RenameField(
            model_name="expense",
            old_name="category_new",
            new_name="category",
        ),
        migrations.AlterField(
            model_name="expense",
            name="category",
            field=models.ForeignKey(
                to="core.expensecategory",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="expenses",
            ),
        ),
    ]
