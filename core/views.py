from datetime import timedelta

from django.db import transaction
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, BookingRoom, Expense, Payment, Room
from .permissions import IsManagerOrAdmin
from .serializers import (
    BookingCancelSerializer,
    BookingCreateSerializer,
    BookingSerializer,
    ExpenseSerializer,
    PaymentSerializer,
    RoomSerializer,
    UserSerializer,
)

ACTIVE_BOOKING_STATUSES = [Booking.Status.CONFIRMED, Booking.Status.CHECKED_IN]


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class RoomAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = parse_date(request.query_params.get("start_date", ""))
        end_date = parse_date(request.query_params.get("end_date", ""))

        if not start_date or not end_date:
            raise ValidationError(
                "Both 'start_date' and 'end_date' (YYYY-MM-DD) are required."
            )
        if end_date <= start_date:
            raise ValidationError("'end_date' must be after 'start_date'.")

        rooms = Room.objects.filter(is_active=True)
        overlapping_allocations = BookingRoom.objects.filter(
            room__in=rooms,
            booking__status__in=ACTIVE_BOOKING_STATUSES,
            booking__check_in__lt=end_date,
            booking__check_out__gt=start_date,
        ).select_related("booking", "room")

        bookings_by_room = {}
        for allocation in overlapping_allocations:
            bookings_by_room.setdefault(allocation.room_id, []).append(
                {
                    "booking_id": allocation.booking_id,
                    "guest_name": allocation.booking.guest.name,
                    "check_in": allocation.booking.check_in,
                    "check_out": allocation.booking.check_out,
                    "status": allocation.booking.status,
                    "source": allocation.booking.source,
                }
            )

        data = []
        for room in rooms:
            room_bookings = bookings_by_room.get(room.id, [])
            data.append(
                {
                    "room": RoomSerializer(room).data,
                    "is_available": len(room_bookings) == 0,
                    "bookings": room_bookings,
                }
            )

        return Response(data)


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("guest").prefetch_related(
        "allocated_rooms__room", "payments"
    )
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return BookingCreateSerializer
        return BookingSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        output = BookingSerializer(booking)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="check-in")
    def check_in(self, request, pk=None):
        booking = self.get_object()
        if booking.status != Booking.Status.CONFIRMED:
            raise ValidationError(
                f"Cannot check in a booking with status '{booking.status}'."
            )
        booking.status = Booking.Status.CHECKED_IN
        booking.save(update_fields=["status"])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["patch"], url_path="check-out")
    def check_out(self, request, pk=None):
        booking = self.get_object()
        if booking.status != Booking.Status.CHECKED_IN:
            raise ValidationError(
                f"Cannot check out a booking with status '{booking.status}'."
            )

        override = bool(request.data.get("override_balance", False))
        if booking.balance_due > 0 and not override:
            raise ValidationError(
                {
                    "balance_due": (
                        f"Balance due of {booking.balance_due} must be settled "
                        "before check-out, or pass 'override_balance': true."
                    )
                }
            )

        booking.status = Booking.Status.CHECKED_OUT
        booking.save(update_fields=["status"])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["patch"], url_path="cancel")
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.status in (Booking.Status.CHECKED_OUT, Booking.Status.CANCELLED):
            raise ValidationError(
                f"Cannot cancel a booking with status '{booking.status}'."
            )

        serializer = BookingCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        booking.status = Booking.Status.CANCELLED
        booking.cancellation_reason = serializer.validated_data.get(
            "cancellation_reason", ""
        )
        booking.save(update_fields=["status", "cancellation_reason"])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="payments")
    def add_payment(self, request, pk=None):
        booking = self.get_object()
        serializer = PaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(booking=booking, recorded_by=request.user)
        return Response(
            BookingSerializer(booking).data, status=status.HTTP_201_CREATED
        )


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        date_from = self.request.query_params.get("from")
        date_to = self.request.query_params.get("to")
        category = self.request.query_params.get("category")

        if date_from:
            qs = qs.filter(date__gte=parse_date(date_from))
        if date_to:
            qs = qs.filter(date__lte=parse_date(date_to))
        if category:
            qs = qs.filter(category=category)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
