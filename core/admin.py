from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Booking, BookingRoom, Expense, Guest, Payment, Room, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Role", {"fields": ("role",)}),)
    list_display = ("username", "email", "role", "is_staff")


class BookingRoomInline(admin.TabularInline):
    model = BookingRoom
    extra = 1


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ("transaction_date",)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("number", "is_active")


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "aadhar_number", "created_at")
    search_fields = ("name", "phone")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "guest",
        "source",
        "check_in",
        "check_out",
        "status",
        "total_amount",
        "balance_due",
    )
    list_filter = ("status", "source")
    inlines = [BookingRoomInline, PaymentInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "amount",
        "payment_type",
        "payment_method",
        "transaction_date",
        "recorded_by",
    )


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "date",
        "category",
        "paid_to",
        "amount",
        "worker_count",
        "created_by",
    )
    list_filter = ("category",)
