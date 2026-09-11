import re

from django.db import models, transaction
from rest_framework import serializers

from .models import (
    Booking,
    BookingRoom,
    Companion,
    Expense,
    ExpenseCategory,
    Guest,
    Payment,
    Room,
    User,
)

AADHAAR_PATTERN = re.compile(r"^\d{12}$")

ACTIVE_BOOKING_STATUSES = [Booking.Status.CONFIRMED, Booking.Status.CHECKED_IN]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role"]


class UserManagementSerializer(serializers.ModelSerializer):
    """Admin-only staff account listing/editing (role, active status)."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]


class UserCreateSerializer(serializers.ModelSerializer):
    """Admin-only staff account creation."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "password",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = [
            "id",
            "number",
            "category",
            "is_active",
            "max_occupancy",
            "bed_type",
            "extra_bed_allowed",
            "extra_bed_charge",
            "amenities",
        ]

    def validate(self, attrs):
        is_active = attrs.get("is_active")
        if (
            self.instance is not None
            and is_active is False
            and self.instance.is_active
        ):
            from django.utils import timezone

            has_current_or_future_booking = BookingRoom.objects.filter(
                room=self.instance,
                booking__status__in=ACTIVE_BOOKING_STATUSES,
                booking__check_out__gt=timezone.localdate(),
            ).exists()
            if has_current_or_future_booking:
                raise serializers.ValidationError(
                    {
                        "is_active": (
                            "This room has a current or upcoming booking and "
                            "cannot be deactivated until it is checked out or "
                            "cancelled."
                        )
                    }
                )

        extra_bed_allowed = attrs.get(
            "extra_bed_allowed",
            self.instance.extra_bed_allowed if self.instance else False,
        )
        extra_bed_charge = attrs.get(
            "extra_bed_charge",
            self.instance.extra_bed_charge if self.instance else None,
        )
        if extra_bed_allowed and not extra_bed_charge:
            raise serializers.ValidationError(
                {
                    "extra_bed_charge": (
                        "Set an extra bed charge when extra beds are allowed."
                    )
                }
            )

        return attrs


class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = ["id", "name", "phone", "aadhar_number", "created_at"]
        read_only_fields = ["id", "created_at"]


def rooms_overlap_queryset(room_ids, check_in, check_out, exclude_booking_id=None):
    """Bookings (active only) that overlap the given date range for any of room_ids."""
    qs = BookingRoom.objects.filter(
        room_id__in=room_ids,
        booking__status__in=ACTIVE_BOOKING_STATUSES,
        booking__check_in__lt=check_out,
        booking__check_out__gt=check_in,
    )
    if exclude_booking_id is not None:
        qs = qs.exclude(booking_id=exclude_booking_id)
    return qs


class PaymentSerializer(serializers.ModelSerializer):
    recorded_by = serializers.PrimaryKeyRelatedField(read_only=True)
    booking = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "booking",
            "amount",
            "payment_type",
            "payment_method",
            "transaction_date",
            "recorded_by",
        ]
        read_only_fields = ["id", "transaction_date", "recorded_by"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be positive.")
        return value


class InitialPaymentSerializer(serializers.Serializer):
    """Used only for the optional initial payment nested inside booking creation."""

    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=Payment.PaymentMethod.choices)
    payment_type = serializers.ChoiceField(
        choices=Payment.PaymentType.choices, default=Payment.PaymentType.ADVANCE
    )

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be positive.")
        return value


class GuestIntakeSerializer(serializers.Serializer):
    """Accepts either an existing guest id, or details to create a new guest."""

    id = serializers.UUIDField(required=False)
    name = serializers.CharField(max_length=255, required=False)
    phone = serializers.CharField(max_length=20, required=False)
    aadhar_number = serializers.CharField(
        max_length=20, required=False, allow_null=True, allow_blank=True
    )

    def validate(self, attrs):
        if not attrs.get("id") and not (attrs.get("name") and attrs.get("phone")):
            raise serializers.ValidationError(
                "Provide either an existing guest 'id', or 'name' and 'phone' "
                "to create a new guest."
            )

        # Aadhaar is only enforced when creating a new guest record; a
        # returning guest looked up by id may predate this requirement.
        if not attrs.get("id"):
            aadhar_number = (attrs.get("aadhar_number") or "").strip()
            if not aadhar_number:
                raise serializers.ValidationError(
                    {"aadhar_number": "Aadhaar number is required."}
                )
            if not AADHAAR_PATTERN.match(aadhar_number):
                raise serializers.ValidationError(
                    {"aadhar_number": "Aadhaar number must be exactly 12 digits."}
                )
            attrs["aadhar_number"] = aadhar_number

        return attrs


class BookingRoomSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.number", read_only=True)
    room_detail = RoomSerializer(source="room", read_only=True)

    class Meta:
        model = BookingRoom
        fields = ["id", "room", "room_number", "room_detail"]


class CompanionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Companion
        fields = ["id", "name", "aadhar_number", "phone"]
        read_only_fields = ["id"]

    def validate_aadhar_number(self, value):
        if not value:
            return value
        value = value.strip()
        if not AADHAAR_PATTERN.match(value):
            raise serializers.ValidationError(
                "Aadhaar number must be exactly 12 digits."
            )
        return value


class BookingSerializer(serializers.ModelSerializer):
    """Read/list serializer with nested rooms, guest, payments, and companions."""

    guest = GuestSerializer(read_only=True)
    allocated_rooms = BookingRoomSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    companions = CompanionSerializer(many=True, read_only=True)
    balance_due = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    amount_paid = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = Booking
        fields = [
            "id",
            "guest",
            "source",
            "ota_reference_id",
            "profile_tag",
            "check_in",
            "check_out",
            "status",
            "total_amount",
            "ota_commission",
            "net_payout",
            "cancellation_reason",
            "created_at",
            "allocated_rooms",
            "payments",
            "companions",
            "balance_due",
            "amount_paid",
        ]
        read_only_fields = ["id", "created_at", "status"]


class BookingCreateSerializer(serializers.Serializer):
    """
    Write serializer for POST /api/bookings/.

    Handles: creating a guest (or reusing an existing one), validating that
    none of the requested rooms overlap an existing active booking for the
    requested date range, creating the booking + room allocations, and
    optionally logging an initial payment.
    """

    guest = GuestIntakeSerializer()
    room_ids = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.all(), many=True, write_only=True
    )
    source = serializers.ChoiceField(
        choices=Booking.Source.choices, default=Booking.Source.DIRECT
    )
    ota_reference_id = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )
    profile_tag = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    ota_commission = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=0
    )
    net_payout = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False
    )
    initial_payment = InitialPaymentSerializer(required=False)
    companions = CompanionSerializer(many=True, required=False)

    def validate(self, attrs):
        check_in = attrs["check_in"]
        check_out = attrs["check_out"]

        if check_out <= check_in:
            raise serializers.ValidationError(
                {"check_out": "check_out must be after check_in."}
            )

        room_ids = [room.id for room in attrs["room_ids"]]
        if not room_ids:
            raise serializers.ValidationError(
                {"room_ids": "At least one room must be selected."}
            )

        overlapping = rooms_overlap_queryset(room_ids, check_in, check_out)
        if overlapping.exists():
            conflicting_rooms = sorted(
                {br.room.number for br in overlapping.select_related("room")}
            )
            raise serializers.ValidationError(
                {
                    "room_ids": (
                        "The following room(s) are already booked for an "
                        f"overlapping date range: {', '.join(conflicting_rooms)}."
                    )
                }
            )

        if "net_payout" not in attrs or attrs.get("net_payout") is None:
            attrs["net_payout"] = attrs["total_amount"] - attrs.get(
                "ota_commission", 0
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        guest_data = validated_data.pop("guest")
        room_ids = validated_data.pop("room_ids")
        initial_payment = validated_data.pop("initial_payment", None)
        companions_data = validated_data.pop("companions", [])

        if guest_data.get("id"):
            try:
                guest = Guest.objects.get(id=guest_data["id"])
            except Guest.DoesNotExist:
                raise serializers.ValidationError(
                    {"guest": {"id": "Guest with this id does not exist."}}
                )
        else:
            guest = Guest.objects.create(
                name=guest_data["name"],
                phone=guest_data["phone"],
                aadhar_number=guest_data.get("aadhar_number"),
            )

        # Re-validate overlap inside the atomic block + lock rows to close the
        # race window between the serializer validation and the actual insert.
        locked_rooms = list(
            Room.objects.select_for_update().filter(id__in=[r.id for r in room_ids])
        )
        overlapping = rooms_overlap_queryset(
            [r.id for r in locked_rooms],
            validated_data["check_in"],
            validated_data["check_out"],
        )
        if overlapping.exists():
            conflicting_rooms = sorted(
                {br.room.number for br in overlapping.select_related("room")}
            )
            raise serializers.ValidationError(
                {
                    "room_ids": (
                        "The following room(s) are already booked for an "
                        f"overlapping date range: {', '.join(conflicting_rooms)}."
                    )
                }
            )

        booking = Booking.objects.create(guest=guest, **validated_data)

        BookingRoom.objects.bulk_create(
            [BookingRoom(booking=booking, room=room) for room in locked_rooms]
        )

        if companions_data:
            Companion.objects.bulk_create(
                [
                    Companion(
                        booking=booking,
                        name=companion["name"],
                        aadhar_number=companion.get("aadhar_number"),
                        phone=companion.get("phone"),
                    )
                    for companion in companions_data
                ]
            )

        if initial_payment:
            request = self.context.get("request")
            Payment.objects.create(
                booking=booking,
                amount=initial_payment["amount"],
                payment_type=initial_payment.get(
                    "payment_type", Payment.PaymentType.ADVANCE
                ),
                payment_method=initial_payment["payment_method"],
                recorded_by=request.user,
            )

        return booking


class BookingCancelSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)


class BookingEditSerializer(serializers.ModelSerializer):
    """
    Admin-only correction endpoint for a booking already created - rate
    fixes, date changes, source/tag corrections. Guest and room allocation
    are intentionally not editable here; cancel + rebook covers changing
    which rooms a booking occupies.
    """

    class Meta:
        model = Booking
        fields = [
            "source",
            "ota_reference_id",
            "profile_tag",
            "check_in",
            "check_out",
            "total_amount",
            "ota_commission",
            "net_payout",
        ]

    def validate(self, attrs):
        check_in = attrs.get("check_in", self.instance.check_in)
        check_out = attrs.get("check_out", self.instance.check_out)

        if check_out <= check_in:
            raise serializers.ValidationError(
                {"check_out": "check_out must be after check_in."}
            )

        if "check_in" in attrs or "check_out" in attrs:
            room_ids = [
                br.room_id for br in self.instance.allocated_rooms.all()
            ]
            overlapping = rooms_overlap_queryset(
                room_ids, check_in, check_out, exclude_booking_id=self.instance.id
            )
            if overlapping.exists():
                conflicting_rooms = sorted(
                    {br.room.number for br in overlapping.select_related("room")}
                )
                raise serializers.ValidationError(
                    {
                        "check_in": (
                            "The following room(s) already have an overlapping "
                            f"booking for these dates: {', '.join(conflicting_rooms)}."
                        )
                    }
                )

        return attrs


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = [
            "id",
            "name",
            "tracks_worker_count",
            "tracks_materials",
            "is_active",
        ]


class ExpenseSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=ExpenseCategory.objects.all()
    )
    category_detail = ExpenseCategorySerializer(source="category", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "date",
            "category",
            "category_detail",
            "job_details",
            "worker_count",
            "paid_to",
            "amount",
            "materials_purchased",
            "created_by",
        ]
        read_only_fields = ["id", "created_by"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expense amount must be positive.")
        return value
