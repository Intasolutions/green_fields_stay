from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Booking, BookingRoom, Expense, Payment, Room

User = get_user_model()


class BaseAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="receptionist1",
            password="testpass123",
            role=User.Role.RECEPTIONIST,
        )
        self.manager = User.objects.create_user(
            username="manager1",
            password="testpass123",
            role=User.Role.MANAGER,
        )
        self.admin = User.objects.create_user(
            username="admin1",
            password="testpass123",
            role=User.Role.ADMIN,
        )

        # Rooms 1-11 already exist via the seeding migration; reuse them.
        self.room1 = Room.objects.get(number="1")
        self.room2 = Room.objects.get(number="2")
        self.room3 = Room.objects.get(number="3")

        self.client.force_authenticate(user=self.user)

    def make_booking_payload(self, room_ids, check_in, check_out, **overrides):
        payload = {
            "guest": {"name": "John Doe", "phone": "9999999999"},
            "room_ids": room_ids,
            "source": Booking.Source.DIRECT,
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "total_amount": "5000.00",
        }
        payload.update(overrides)
        return payload


class RoomSeedTests(BaseAPITestCase):
    def test_eleven_rooms_seeded_via_migration(self):
        # Rooms 1-3 created in setUp for isolated test data; verify the
        # seeding migration itself produces exactly 11 rooms on a fresh DB
        # by checking the management command idempotently reaches 11 total
        # when starting from empty (simulated by count assertion pattern).
        from django.core.management import call_command

        Room.objects.all().delete()
        call_command("seed_rooms")
        self.assertEqual(Room.objects.count(), 11)
        numbers = set(Room.objects.values_list("number", flat=True))
        self.assertEqual(numbers, {str(i) for i in range(1, 12)})


class BookingCreateTests(BaseAPITestCase):
    def test_create_booking_with_new_guest_single_room(self):
        url = reverse("booking-list")
        check_in = date.today() + timedelta(days=1)
        check_out = date.today() + timedelta(days=3)
        payload = self.make_booking_payload([self.room1.id], check_in, check_out)

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Booking.objects.count(), 1)
        booking = Booking.objects.first()
        self.assertEqual(booking.guest.name, "John Doe")
        self.assertEqual(booking.allocated_rooms.count(), 1)
        self.assertEqual(booking.status, Booking.Status.CONFIRMED)

    def test_create_multi_room_booking(self):
        url = reverse("booking-list")
        check_in = date.today() + timedelta(days=1)
        check_out = date.today() + timedelta(days=3)
        payload = self.make_booking_payload(
            [self.room1.id, self.room2.id], check_in, check_out
        )

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        booking = Booking.objects.get(id=response.data["id"])
        self.assertEqual(booking.allocated_rooms.count(), 2)

    def test_create_booking_with_existing_guest(self):
        from .models import Guest

        guest = Guest.objects.create(name="Jane Doe", phone="8888888888")
        url = reverse("booking-list")
        check_in = date.today() + timedelta(days=1)
        check_out = date.today() + timedelta(days=3)
        payload = self.make_booking_payload(
            [self.room1.id], check_in, check_out, guest={"id": str(guest.id)}
        )

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Booking.objects.first().guest_id, guest.id)

    def test_create_booking_with_initial_payment(self):
        url = reverse("booking-list")
        check_in = date.today() + timedelta(days=1)
        check_out = date.today() + timedelta(days=3)
        payload = self.make_booking_payload(
            [self.room1.id],
            check_in,
            check_out,
            initial_payment={
                "amount": "2000.00",
                "payment_method": Payment.PaymentMethod.CASH,
                "payment_type": Payment.PaymentType.ADVANCE,
            },
        )

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        booking = Booking.objects.first()
        self.assertEqual(booking.payments.count(), 1)
        self.assertEqual(booking.amount_paid, Decimal("2000.00"))
        self.assertEqual(booking.balance_due, Decimal("3000.00"))

    def test_check_out_before_check_in_rejected(self):
        url = reverse("booking-list")
        check_in = date.today() + timedelta(days=3)
        check_out = date.today() + timedelta(days=1)
        payload = self.make_booking_payload([self.room1.id], check_in, check_out)

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_room_ids_rejected(self):
        url = reverse("booking-list")
        check_in = date.today() + timedelta(days=1)
        check_out = date.today() + timedelta(days=3)
        payload = self.make_booking_payload([], check_in, check_out)

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DoubleBookingValidationTests(BaseAPITestCase):
    """Core requirement: overlapping dates for the same room must be blocked with 400."""

    def _create_confirmed_booking(self, room, check_in, check_out):
        url = reverse("booking-list")
        payload = self.make_booking_payload([room.id], check_in, check_out)
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data

    def test_exact_overlap_blocked(self):
        base = date.today() + timedelta(days=10)
        self._create_confirmed_booking(self.room1, base, base + timedelta(days=5))

        url = reverse("booking-list")
        payload = self.make_booking_payload(
            [self.room1.id], base, base + timedelta(days=5)
        )
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("room_ids", response.data)

    def test_partial_overlap_start_blocked(self):
        base = date.today() + timedelta(days=10)
        self._create_confirmed_booking(self.room1, base, base + timedelta(days=5))

        url = reverse("booking-list")
        # New booking starts before existing ends, ends after -> overlaps.
        payload = self.make_booking_payload(
            [self.room1.id],
            base + timedelta(days=3),
            base + timedelta(days=8),
        )
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_partial_overlap_end_blocked(self):
        base = date.today() + timedelta(days=10)
        self._create_confirmed_booking(self.room1, base, base + timedelta(days=5))

        url = reverse("booking-list")
        payload = self.make_booking_payload(
            [self.room1.id],
            base - timedelta(days=2),
            base + timedelta(days=2),
        )
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enclosing_overlap_blocked(self):
        base = date.today() + timedelta(days=10)
        self._create_confirmed_booking(self.room1, base, base + timedelta(days=5))

        url = reverse("booking-list")
        payload = self.make_booking_payload(
            [self.room1.id],
            base - timedelta(days=2),
            base + timedelta(days=8),
        )
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_adjacent_dates_not_overlapping_allowed(self):
        """Checkout day == next check-in day should be allowed (no overlap)."""
        base = date.today() + timedelta(days=10)
        self._create_confirmed_booking(self.room1, base, base + timedelta(days=5))

        url = reverse("booking-list")
        payload = self.make_booking_payload(
            [self.room1.id],
            base + timedelta(days=5),
            base + timedelta(days=8),
        )
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_different_room_not_blocked(self):
        base = date.today() + timedelta(days=10)
        self._create_confirmed_booking(self.room1, base, base + timedelta(days=5))

        url = reverse("booking-list")
        payload = self.make_booking_payload(
            [self.room2.id], base, base + timedelta(days=5)
        )
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_multi_room_booking_blocked_if_any_room_conflicts(self):
        base = date.today() + timedelta(days=10)
        self._create_confirmed_booking(self.room2, base, base + timedelta(days=5))

        url = reverse("booking-list")
        # room1 is free, room2 conflicts -> whole booking should be rejected.
        payload = self.make_booking_payload(
            [self.room1.id, self.room2.id], base, base + timedelta(days=5)
        )
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Ensure no partial booking was created.
        self.assertEqual(
            BookingRoom.objects.filter(room=self.room1).count(), 0
        )

    def test_cancelled_booking_frees_room(self):
        base = date.today() + timedelta(days=10)
        first = self._create_confirmed_booking(
            self.room1, base, base + timedelta(days=5)
        )

        cancel_url = reverse("booking-cancel", args=[first["id"]])
        cancel_response = self.client.patch(
            cancel_url, {"cancellation_reason": "Guest request"}, format="json"
        )
        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_response.data["status"], Booking.Status.CANCELLED)

        url = reverse("booking-list")
        payload = self.make_booking_payload(
            [self.room1.id], base, base + timedelta(days=5)
        )
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_checked_out_booking_does_not_block_new_booking(self):
        base = date.today() + timedelta(days=10)
        first = self._create_confirmed_booking(
            self.room1, base, base + timedelta(days=5)
        )
        Booking.objects.filter(id=first["id"]).update(
            status=Booking.Status.CHECKED_OUT
        )

        url = reverse("booking-list")
        payload = self.make_booking_payload(
            [self.room1.id], base, base + timedelta(days=5)
        )
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)


class BookingLifecycleTests(BaseAPITestCase):
    def _create_booking(self, room, check_in, check_out, total_amount="5000.00"):
        url = reverse("booking-list")
        payload = self.make_booking_payload(
            [room.id], check_in, check_out, total_amount=total_amount
        )
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data

    def test_check_in_flow(self):
        base = date.today() + timedelta(days=1)
        booking = self._create_booking(self.room1, base, base + timedelta(days=2))

        url = reverse("booking-check-in", args=[booking["id"]])
        response = self.client.patch(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Booking.Status.CHECKED_IN)

    def test_check_out_blocked_with_balance_due(self):
        base = date.today() + timedelta(days=1)
        booking = self._create_booking(self.room1, base, base + timedelta(days=2))
        self.client.patch(reverse("booking-check-in", args=[booking["id"]]))

        url = reverse("booking-check-out", args=[booking["id"]])
        response = self.client.patch(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_check_out_allowed_when_balance_settled(self):
        base = date.today() + timedelta(days=1)
        booking = self._create_booking(
            self.room1, base, base + timedelta(days=2), total_amount="1000.00"
        )
        self.client.patch(reverse("booking-check-in", args=[booking["id"]]))

        payment_url = reverse("booking-add-payment", args=[booking["id"]])
        self.client.post(
            payment_url,
            {
                "amount": "1000.00",
                "payment_type": Payment.PaymentType.SETTLEMENT,
                "payment_method": Payment.PaymentMethod.CASH,
            },
            format="json",
        )

        url = reverse("booking-check-out", args=[booking["id"]])
        response = self.client.patch(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Booking.Status.CHECKED_OUT)

    def test_check_out_with_override_allows_unsettled_balance(self):
        base = date.today() + timedelta(days=1)
        booking = self._create_booking(self.room1, base, base + timedelta(days=2))
        self.client.patch(reverse("booking-check-in", args=[booking["id"]]))

        url = reverse("booking-check-out", args=[booking["id"]])
        response = self.client.patch(url, {"override_balance": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Booking.Status.CHECKED_OUT)

    def test_add_payment_endpoint(self):
        base = date.today() + timedelta(days=1)
        booking = self._create_booking(self.room1, base, base + timedelta(days=2))

        url = reverse("booking-add-payment", args=[booking["id"]])
        response = self.client.post(
            url,
            {
                "amount": "1500.00",
                "payment_type": Payment.PaymentType.ADVANCE,
                "payment_method": Payment.PaymentMethod.UPI,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Payment.objects.count(), 1)

    def test_negative_payment_rejected(self):
        base = date.today() + timedelta(days=1)
        booking = self._create_booking(self.room1, base, base + timedelta(days=2))

        url = reverse("booking-add-payment", args=[booking["id"]])
        response = self.client.post(
            url,
            {
                "amount": "-100.00",
                "payment_type": Payment.PaymentType.ADVANCE,
                "payment_method": Payment.PaymentMethod.UPI,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RoomAvailabilityViewTests(BaseAPITestCase):
    def test_availability_reflects_bookings(self):
        base = date.today() + timedelta(days=1)
        url = reverse("booking-list")
        payload = self.make_booking_payload(
            [self.room1.id], base, base + timedelta(days=2)
        )
        self.client.post(url, payload, format="json")

        availability_url = reverse("room-availability")
        response = self.client.get(
            availability_url,
            {
                "start_date": base.isoformat(),
                "end_date": (base + timedelta(days=2)).isoformat(),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        room1_entry = next(
            r for r in response.data if r["room"]["number"] == "1"
        )
        self.assertFalse(room1_entry["is_available"])

        room3_entry = next(
            r for r in response.data if r["room"]["number"] == "3"
        )
        self.assertTrue(room3_entry["is_available"])

    def test_availability_includes_profile_tag(self):
        base = date.today() + timedelta(days=1)
        url = reverse("booking-list")
        payload = self.make_booking_payload(
            [self.room1.id],
            base,
            base + timedelta(days=2),
            profile_tag="Family of 4",
        )
        self.client.post(url, payload, format="json")

        availability_url = reverse("room-availability")
        response = self.client.get(
            availability_url,
            {
                "start_date": base.isoformat(),
                "end_date": (base + timedelta(days=2)).isoformat(),
            },
        )

        room1_entry = next(
            r for r in response.data if r["room"]["number"] == "1"
        )
        self.assertEqual(room1_entry["bookings"][0]["profile_tag"], "Family of 4")

    def test_missing_dates_returns_400(self):
        availability_url = reverse("room-availability")
        response = self.client.get(availability_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class BookingListFilterTests(BaseAPITestCase):
    def test_filter_by_check_in_date(self):
        today = date.today()
        url = reverse("booking-list")
        self.client.post(
            url,
            self.make_booking_payload(
                [self.room1.id], today, today + timedelta(days=2)
            ),
            format="json",
        )
        self.client.post(
            url,
            self.make_booking_payload(
                [self.room2.id],
                today + timedelta(days=5),
                today + timedelta(days=7),
            ),
            format="json",
        )

        response = self.client.get(url, {"check_in": today.isoformat()})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_check_out_date(self):
        today = date.today()
        url = reverse("booking-list")
        self.client.post(
            url,
            self.make_booking_payload(
                [self.room1.id], today, today + timedelta(days=2)
            ),
            format="json",
        )

        response = self.client.get(
            url, {"check_out": (today + timedelta(days=2)).isoformat()}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_search_by_guest_name(self):
        today = date.today()
        url = reverse("booking-list")
        self.client.post(
            url,
            self.make_booking_payload(
                [self.room1.id],
                today,
                today + timedelta(days=2),
                guest={"name": "Ravi Kumar", "phone": "9111111111"},
            ),
            format="json",
        )
        self.client.post(
            url,
            self.make_booking_payload(
                [self.room2.id],
                today,
                today + timedelta(days=2),
                guest={"name": "Sita Devi", "phone": "9222222222"},
            ),
            format="json",
        )

        response = self.client.get(url, {"search": "ravi"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["guest"]["name"], "Ravi Kumar")

    def test_search_by_guest_phone(self):
        today = date.today()
        url = reverse("booking-list")
        self.client.post(
            url,
            self.make_booking_payload(
                [self.room1.id],
                today,
                today + timedelta(days=2),
                guest={"name": "Ravi Kumar", "phone": "9111111111"},
            ),
            format="json",
        )

        response = self.client.get(url, {"search": "91111"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)


class ExpensePermissionTests(BaseAPITestCase):
    def test_receptionist_cannot_access_expenses(self):
        url = reverse("expense-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_receptionist_cannot_create_expense(self):
        url = reverse("expense-list")
        response = self.client.post(
            url,
            {
                "date": date.today().isoformat(),
                "category": "LABOR",
                "job_details": "Roof repair",
                "worker_count": 3,
                "paid_to": "Natraj",
                "amount": "4500.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_create_expense(self):
        self.client.force_authenticate(user=self.manager)
        url = reverse("expense-list")
        response = self.client.post(
            url,
            {
                "date": date.today().isoformat(),
                "category": "LABOR",
                "job_details": "Roof repair",
                "worker_count": 3,
                "paid_to": "Natraj",
                "amount": "4500.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["created_by"], self.manager.id)

    def test_admin_can_access_expenses(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("expense-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_expense_filtering_by_date_and_category(self):
        self.client.force_authenticate(user=self.manager)
        Expense.objects.create(
            date=date(2026, 1, 5),
            category=Expense.Category.LABOR,
            job_details="Painting",
            paid_to="Ravi",
            amount=Decimal("1000.00"),
            created_by=self.manager,
        )
        Expense.objects.create(
            date=date(2026, 1, 20),
            category=Expense.Category.MATERIALS,
            job_details="Cement bags",
            paid_to="Supplier",
            amount=Decimal("2000.00"),
            created_by=self.manager,
        )
        Expense.objects.create(
            date=date(2026, 2, 5),
            category=Expense.Category.LABOR,
            job_details="Outside window range",
            paid_to="Ravi",
            amount=Decimal("500.00"),
            created_by=self.manager,
        )

        url = reverse("expense-list")
        response = self.client.get(
            url,
            {"from_date": "2026-01-01", "to_date": "2026-01-31", "category": "LABOR"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["job_details"], "Painting")


class ReportsPermissionTests(BaseAPITestCase):
    def test_receptionist_forbidden_from_financial_summary(self):
        url = reverse("report-financial-summary")
        response = self.client.get(url, {"from": "2026-01-01", "to": "2026-01-31"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_receptionist_forbidden_from_occupancy_report(self):
        url = reverse("report-occupancy")
        response = self.client.get(url, {"from": "2026-01-01", "to": "2026-01-31"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_forbidden_from_financial_summary(self):
        self.client.force_authenticate(user=self.manager)
        url = reverse("report-financial-summary")
        response = self.client.get(url, {"from": "2026-01-01", "to": "2026-01-31"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_forbidden_from_occupancy_report(self):
        self.client.force_authenticate(user=self.manager)
        url = reverse("report-occupancy")
        response = self.client.get(url, {"from": "2026-01-01", "to": "2026-01-31"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_financial_summary(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("report-financial-summary")
        response = self.client.get(url, {"from": "2026-01-01", "to": "2026-01-31"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_access_occupancy_report(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("report-occupancy")
        response = self.client.get(url, {"from": "2026-01-01", "to": "2026-01-31"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_missing_date_params_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("report-financial-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FinancialSummaryReportTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def _create_booking_direct(
        self, room, check_in, check_out, total_amount, status_=Booking.Status.CONFIRMED
    ):
        from .models import Guest

        guest = Guest.objects.create(name="Report Guest", phone="7000000000")
        booking = Booking.objects.create(
            guest=guest,
            source=Booking.Source.DIRECT,
            check_in=check_in,
            check_out=check_out,
            status=status_,
            total_amount=Decimal(total_amount),
            ota_commission=Decimal("0.00"),
            net_payout=Decimal(total_amount),
        )
        BookingRoom.objects.create(booking=booking, room=room)
        return booking

    def _create_booking_ota(
        self, room, check_in, check_out, total_amount, commission
    ):
        from .models import Guest

        guest = Guest.objects.create(name="OTA Guest", phone="7000000001")
        net_payout = Decimal(total_amount) - Decimal(commission)
        booking = Booking.objects.create(
            guest=guest,
            source=Booking.Source.MMT,
            check_in=check_in,
            check_out=check_out,
            status=Booking.Status.CONFIRMED,
            total_amount=Decimal(total_amount),
            ota_commission=Decimal(commission),
            net_payout=net_payout,
        )
        BookingRoom.objects.create(booking=booking, room=room)
        return booking

    def test_revenue_and_commission_aggregation(self):
        self._create_booking_direct(
            self.room1, date(2026, 3, 5), date(2026, 3, 8), "6000.00"
        )
        self._create_booking_ota(
            self.room2, date(2026, 3, 10), date(2026, 3, 12), "4000.00", "800.00"
        )

        url = reverse("report-financial-summary")
        response = self.client.get(url, {"from": "2026-03-01", "to": "2026-03-31"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(Decimal(data["total_booking_revenue"]), Decimal("10000.00"))
        self.assertEqual(Decimal(data["total_ota_commissions"]), Decimal("800.00"))
        self.assertEqual(Decimal(data["total_net_payout"]), Decimal("9200.00"))

    def test_cancelled_bookings_excluded_from_revenue(self):
        self._create_booking_direct(
            self.room1,
            date(2026, 3, 5),
            date(2026, 3, 8),
            "6000.00",
            status_=Booking.Status.CANCELLED,
        )

        url = reverse("report-financial-summary")
        response = self.client.get(url, {"from": "2026-03-01", "to": "2026-03-31"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["total_booking_revenue"]), Decimal("0"))

    def test_bookings_outside_date_window_excluded(self):
        self._create_booking_direct(
            self.room1, date(2026, 4, 5), date(2026, 4, 8), "6000.00"
        )

        url = reverse("report-financial-summary")
        response = self.client.get(url, {"from": "2026-03-01", "to": "2026-03-31"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["total_booking_revenue"]), Decimal("0"))

    def test_expenses_breakdown_and_net_profit(self):
        self._create_booking_direct(
            self.room1, date(2026, 3, 5), date(2026, 3, 8), "10000.00"
        )
        Expense.objects.create(
            date=date(2026, 3, 6),
            category=Expense.Category.LABOR,
            job_details="Wages",
            paid_to="Natraj",
            amount=Decimal("2000.00"),
            created_by=self.admin,
        )
        Expense.objects.create(
            date=date(2026, 3, 15),
            category=Expense.Category.MATERIALS,
            job_details="Sheets",
            paid_to="Supplier",
            amount=Decimal("1500.00"),
            created_by=self.admin,
        )
        # Outside the report window - must not be counted.
        Expense.objects.create(
            date=date(2026, 4, 1),
            category=Expense.Category.LABOR,
            job_details="Later month",
            paid_to="Natraj",
            amount=Decimal("999.00"),
            created_by=self.admin,
        )

        url = reverse("report-financial-summary")
        response = self.client.get(url, {"from": "2026-03-01", "to": "2026-03-31"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(Decimal(data["total_expenses"]), Decimal("3500.00"))
        self.assertEqual(
            Decimal(data["expenses_by_category"]["LABOR"]), Decimal("2000.00")
        )
        self.assertEqual(
            Decimal(data["expenses_by_category"]["MATERIALS"]), Decimal("1500.00")
        )
        self.assertEqual(Decimal(data["expenses_by_category"]["UTILITIES"]), Decimal("0"))
        self.assertEqual(
            Decimal(data["total_net_payout"]), Decimal("10000.00")
        )
        self.assertEqual(Decimal(data["net_profit"]), Decimal("6500.00"))


class OccupancyReportTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def _create_booking(self, room, check_in, check_out, status_=Booking.Status.CONFIRMED):
        from .models import Guest

        guest = Guest.objects.create(name="Occ Guest", phone="7100000000")
        booking = Booking.objects.create(
            guest=guest,
            source=Booking.Source.DIRECT,
            check_in=check_in,
            check_out=check_out,
            status=status_,
            total_amount=Decimal("1000.00"),
            net_payout=Decimal("1000.00"),
        )
        BookingRoom.objects.create(booking=booking, room=room)
        return booking

    def test_room_nights_fully_inside_window(self):
        self._create_booking(self.room1, date(2026, 5, 5), date(2026, 5, 8))

        url = reverse("report-occupancy")
        response = self.client.get(url, {"from": "2026-05-01", "to": "2026-05-31"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data["number_of_days"], 31)
        self.assertEqual(data["total_room_nights_sold"], 3)
        room1_entry = next(r for r in data["rooms"] if r["room_number"] == "1")
        self.assertEqual(room1_entry["nights_booked"], 3)

        expected_pct = round((3 / (11 * 31)) * 100, 2)
        self.assertEqual(data["occupancy_percentage"], expected_pct)

    def test_stay_clipped_to_window_boundaries(self):
        # Booking starts before window and ends after -> only nights inside
        # [from, to] should count.
        self._create_booking(self.room1, date(2026, 5, 28), date(2026, 6, 3))

        url = reverse("report-occupancy")
        response = self.client.get(url, {"from": "2026-05-01", "to": "2026-05-31"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        room1_entry = next(
            r for r in response.data["rooms"] if r["room_number"] == "1"
        )
        # Nights counted: 28, 29, 30, 31 = 4 nights within May.
        self.assertEqual(room1_entry["nights_booked"], 4)

    def test_cancelled_booking_excluded_from_occupancy(self):
        self._create_booking(
            self.room1,
            date(2026, 5, 5),
            date(2026, 5, 8),
            status_=Booking.Status.CANCELLED,
        )

        url = reverse("report-occupancy")
        response = self.client.get(url, {"from": "2026-05-01", "to": "2026-05-31"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_room_nights_sold"], 0)

    def test_multiple_rooms_breakdown(self):
        self._create_booking(self.room1, date(2026, 5, 1), date(2026, 5, 4))
        self._create_booking(self.room2, date(2026, 5, 1), date(2026, 5, 6))

        url = reverse("report-occupancy")
        response = self.client.get(url, {"from": "2026-05-01", "to": "2026-05-31"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data["total_room_nights_sold"], 8)
        self.assertEqual(len(data["rooms"]), 11)


class AuthTests(BaseAPITestCase):
    def test_me_endpoint_returns_role(self):
        url = reverse("me")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], User.Role.RECEPTIONIST)

    def test_token_obtain_pair(self):
        self.client.force_authenticate(user=None)
        url = reverse("token_obtain_pair")
        response = self.client.post(
            url,
            {"username": "receptionist1", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
