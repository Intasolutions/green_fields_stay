from datetime import timedelta

from django.db import models, transaction
from django.db.models import Sum
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, BookingRoom, Expense, Guest, Payment, Room
from .permissions import IsAdmin, IsManagerOrAdmin
from .serializers import (
    BookingCancelSerializer,
    BookingCreateSerializer,
    BookingSerializer,
    ExpenseSerializer,
    GuestSerializer,
    PaymentSerializer,
    RoomSerializer,
    UserSerializer,
)

ACTIVE_BOOKING_STATUSES = [Booking.Status.CONFIRMED, Booking.Status.CHECKED_IN]
NON_CANCELLED_STATUSES = [
    Booking.Status.CONFIRMED,
    Booking.Status.CHECKED_IN,
    Booking.Status.CHECKED_OUT,
]


def _parse_report_date_range(request):
    date_from = parse_date(request.query_params.get("from", ""))
    date_to = parse_date(request.query_params.get("to", ""))

    if not date_from or not date_to:
        raise ValidationError("Both 'from' and 'to' (YYYY-MM-DD) are required.")
    if date_to < date_from:
        raise ValidationError("'to' must be on or after 'from'.")

    return date_from, date_to


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
        ).select_related("booking", "room").prefetch_related("booking__payments")

        bookings_by_room = {}
        for allocation in overlapping_allocations:
            bookings_by_room.setdefault(allocation.room_id, []).append(
                {
                    "booking_id": allocation.booking_id,
                    "guest_name": allocation.booking.guest.name,
                    "profile_tag": allocation.booking.profile_tag,
                    "check_in": allocation.booking.check_in,
                    "check_out": allocation.booking.check_out,
                    "status": allocation.booking.status,
                    "source": allocation.booking.source,
                    "balance_due": allocation.booking.balance_due,
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


class RoomViewSet(viewsets.ModelViewSet):
    """Admin-only room management (add, rename, activate/deactivate)."""

    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]


class GuestViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only lookup used by the New Booking form to find returning guests."""

    queryset = Guest.objects.all().order_by("-created_at")
    serializer_class = GuestSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                models.Q(name__icontains=search) | models.Q(phone__icontains=search)
            )
        return qs[:10] if search else qs[:0]


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("guest").prefetch_related(
        "allocated_rooms__room", "payments"
    )
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action == "cancel":
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "create":
            return BookingCreateSerializer
        return BookingSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        status_param = params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        check_in = parse_date(params.get("check_in", ""))
        if check_in:
            qs = qs.filter(check_in=check_in)

        check_out = parse_date(params.get("check_out", ""))
        if check_out:
            qs = qs.filter(check_out=check_out)

        search = params.get("search", "").strip()
        if search:
            qs = qs.filter(
                models.Q(guest__name__icontains=search)
                | models.Q(guest__phone__icontains=search)
            )

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
        params = self.request.query_params
        date_from = params.get("from_date") or params.get("from")
        date_to = params.get("to_date") or params.get("to")
        category = params.get("category")

        if date_from:
            qs = qs.filter(date__gte=parse_date(date_from))
        if date_to:
            qs = qs.filter(date__lte=parse_date(date_to))
        if category:
            qs = qs.filter(category=category)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class FinancialSummaryReportView(APIView):
    """Admin-only P&L style report for a date range, keyed off booking check_in date."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        date_from, date_to = _parse_report_date_range(request)

        bookings = Booking.objects.filter(
            status__in=NON_CANCELLED_STATUSES,
            check_in__gte=date_from,
            check_in__lte=date_to,
        )
        booking_totals = bookings.aggregate(
            total_booking_revenue=Sum("total_amount"),
            total_ota_commissions=Sum("ota_commission"),
            total_net_payout=Sum("net_payout"),
            booking_count=models.Count("id"),
        )

        booking_count = booking_totals["booking_count"] or 0
        total_booking_revenue = booking_totals["total_booking_revenue"] or 0
        average_booking_value = (
            (total_booking_revenue / booking_count) if booking_count else 0
        )

        bookings_by_source = {choice: 0 for choice, _ in Booking.Source.choices}
        revenue_by_source = {choice: 0 for choice, _ in Booking.Source.choices}
        for row in bookings.values("source").annotate(
            count=models.Count("id"), revenue=Sum("total_amount")
        ):
            bookings_by_source[row["source"]] = row["count"]
            revenue_by_source[row["source"]] = row["revenue"] or 0

        cancelled_count = Booking.objects.filter(
            status=Booking.Status.CANCELLED,
            check_in__gte=date_from,
            check_in__lte=date_to,
        ).count()

        payments = Payment.objects.filter(
            booking__check_in__gte=date_from,
            booking__check_in__lte=date_to,
            booking__status__in=NON_CANCELLED_STATUSES,
        ).exclude(payment_type=Payment.PaymentType.REFUND)

        payments_by_method = {choice: 0 for choice, _ in Payment.PaymentMethod.choices}
        for row in payments.values("payment_method").annotate(total=Sum("amount")):
            payments_by_method[row["payment_method"]] = row["total"] or 0

        expenses = Expense.objects.filter(date__gte=date_from, date__lte=date_to)
        expense_total = expenses.aggregate(total=Sum("amount"))["total"] or 0

        expenses_by_category = {choice: 0 for choice, _ in Expense.Category.choices}
        for row in expenses.values("category").annotate(total=Sum("amount")):
            expenses_by_category[row["category"]] = row["total"]

        total_net_payout = booking_totals["total_net_payout"] or 0
        net_profit = total_net_payout - expense_total

        return Response(
            {
                "from": date_from,
                "to": date_to,
                "total_booking_revenue": total_booking_revenue,
                "total_ota_commissions": booking_totals["total_ota_commissions"] or 0,
                "total_net_payout": total_net_payout,
                "total_expenses": expense_total,
                "expenses_by_category": expenses_by_category,
                "net_profit": net_profit,
                "booking_count": booking_count,
                "average_booking_value": average_booking_value,
                "cancelled_count": cancelled_count,
                "bookings_by_source": bookings_by_source,
                "revenue_by_source": revenue_by_source,
                "payments_by_method": payments_by_method,
            }
        )


class OccupancyReportView(APIView):
    """Admin-only lodge-wide + per-room occupancy report for a date range."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        date_from, date_to = _parse_report_date_range(request)

        num_days = (date_to - date_from).days + 1
        rooms = list(Room.objects.filter(is_active=True).order_by("number"))
        total_room_capacity = len(rooms) * num_days

        nights_by_room = {room.id: 0 for room in rooms}

        allocations = BookingRoom.objects.filter(
            room__in=rooms,
            booking__status__in=ACTIVE_BOOKING_STATUSES + [Booking.Status.CHECKED_OUT],
            booking__check_in__lte=date_to,
            booking__check_out__gt=date_from,
        ).select_related("booking")

        window_end_exclusive = date_to + timedelta(days=1)

        for allocation in allocations:
            stay_start = max(allocation.booking.check_in, date_from)
            stay_end = min(allocation.booking.check_out, window_end_exclusive)
            nights = (stay_end - stay_start).days
            if nights > 0:
                nights_by_room[allocation.room_id] += nights

        total_room_nights_sold = sum(nights_by_room.values())
        occupancy_percentage = (
            round((total_room_nights_sold / total_room_capacity) * 100, 2)
            if total_room_capacity
            else 0
        )

        room_breakdown = [
            {
                "room_number": room.number,
                "nights_booked": nights_by_room[room.id],
                "occupancy_percentage": (
                    round((nights_by_room[room.id] / num_days) * 100, 2)
                    if num_days
                    else 0
                ),
            }
            for room in rooms
        ]

        return Response(
            {
                "from": date_from,
                "to": date_to,
                "number_of_days": num_days,
                "total_rooms": len(rooms),
                "total_room_nights_sold": total_room_nights_sold,
                "occupancy_percentage": occupancy_percentage,
                "rooms": room_breakdown,
            }
        )
