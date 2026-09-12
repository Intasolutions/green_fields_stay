import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        RECEPTIONIST = "RECEPTIONIST", "Receptionist"
        MANAGER = "MANAGER", "Manager"
        ADMIN = "ADMIN", "Admin"

    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.RECEPTIONIST
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


class Room(models.Model):
    class Category(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        DELUXE = "DELUXE", "Deluxe"

    class BedType(models.TextChoices):
        SINGLE = "SINGLE", "Single"
        DOUBLE = "DOUBLE", "Double"
        TWIN = "TWIN", "Twin"
        QUEEN = "QUEEN", "Queen"
        KING = "KING", "King"

    number = models.CharField(max_length=10, unique=True)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.NORMAL
    )
    is_active = models.BooleanField(default=True)
    max_occupancy = models.PositiveIntegerField(default=2)
    bed_type = models.CharField(
        max_length=20, choices=BedType.choices, default=BedType.DOUBLE
    )
    extra_bed_allowed = models.BooleanField(default=False)
    extra_bed_charge = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    amenities = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["number"]

    def __str__(self):
        return f"Room {self.number}"


class Guest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, db_index=True)
    aadhar_number = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Booking(models.Model):
    class Source(models.TextChoices):
        DIRECT = "DIRECT", "Direct"
        MMT = "MMT", "MakeMyTrip"
        AGODA = "AGODA", "Agoda"
        BOOKING_COM = "BOOKING_COM", "Booking.com"
        GOIBIBO = "GOIBIBO", "Goibibo"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        CONFIRMED = "CONFIRMED", "Confirmed"
        CHECKED_IN = "CHECKED_IN", "Checked In"
        CHECKED_OUT = "CHECKED_OUT", "Checked Out"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest = models.ForeignKey(
        Guest, on_delete=models.PROTECT, related_name="bookings"
    )
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.DIRECT
    )
    ota_reference_id = models.CharField(max_length=100, null=True, blank=True)
    profile_tag = models.CharField(max_length=100, null=True, blank=True)
    check_in = models.DateField()
    check_out = models.DateField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.CONFIRMED
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    ota_commission = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    net_payout = models.DecimalField(max_digits=10, decimal_places=2)
    cancellation_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Booking {self.id} ({self.guest.name})"

    @property
    def amount_paid(self):
        from django.db.models import Sum

        total = self.payments.aggregate(total=Sum("amount"))["total"]
        return total or 0

    @property
    def balance_due(self):
        return self.total_amount - self.amount_paid


class Companion(models.Model):
    """A co-traveler on a booking, distinct from the primary Guest record."""

    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="companions"
    )
    name = models.CharField(max_length=255)
    aadhar_number = models.CharField(max_length=20, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"{self.name} (companion on {self.booking_id})"


class BookingRoom(models.Model):
    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="allocated_rooms"
    )
    room = models.ForeignKey(Room, on_delete=models.PROTECT)

    class Meta:
        unique_together = ("booking", "room")

    def __str__(self):
        return f"{self.room} -> {self.booking_id}"


class Payment(models.Model):
    class PaymentType(models.TextChoices):
        ADVANCE = "ADVANCE", "Advance"
        SETTLEMENT = "SETTLEMENT", "Settlement"
        FULL = "FULL", "Full"
        REFUND = "REFUND", "Refund"

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        UPI = "UPI", "UPI"
        CARD = "CARD", "Card"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="payments"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PaymentType.choices)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    transaction_date = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(
        "core.User", on_delete=models.PROTECT, related_name="payments_recorded"
    )

    class Meta:
        ordering = ["-transaction_date"]

    def __str__(self):
        return f"{self.payment_type} {self.amount} for {self.booking_id}"


class ExpenseCategory(models.Model):
    """Admin-managed expense categories (e.g. Labor, Materials, Utilities)."""

    name = models.CharField(max_length=100, unique=True)
    tracks_worker_count = models.BooleanField(default=False)
    tracks_materials = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "expense categories"

    def __str__(self):
        return self.name


class Expense(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField()
    category = models.ForeignKey(
        ExpenseCategory, on_delete=models.PROTECT, related_name="expenses"
    )
    job_details = models.CharField(max_length=255)
    worker_count = models.IntegerField(null=True, blank=True)
    paid_to = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    materials_purchased = models.CharField(max_length=255, null=True, blank=True)
    created_by = models.ForeignKey(
        "core.User", on_delete=models.PROTECT, related_name="expenses_created"
    )

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.category} - {self.amount} on {self.date}"
