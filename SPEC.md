# Lodge Management System (LMS) — Developer Specification

## 1. System Overview

* **Property:** 11-room independent lodge (Rooms numbered 1 to 11).
* **Architecture:** Decoupled client-server architecture.
* **Frontend:** Next.js (App Router, TypeScript, Tailwind CSS, Lucide icons) deployed on Vercel.
* **Backend:** Django 5.x + Django REST Framework (DRF), JWT Authentication (`djangorestframework-simplejwt`), deployed on Render.
* **Database:** PostgreSQL hosted on Neon DB.


* **Core Philosophy:** High-density, fast-loading internal utility dashboard. Zero unnecessary navigation; front-desk actions must be doable in under 3 clicks.

---

## 2. Role-Based Access Control (RBAC)

| Role | Permissions & Access Scope |
| --- | --- |
| **Receptionist** | Create/view bookings, check-in/check-out guests, record advance & settlement payments, view live 11-room calendar. **Restricted:** Cannot view lodge expenses, net profit reports, or edit past financial ledgers. |
| **Manager** | All Receptionist permissions + full access to the **Expenses & Maintenance Module** (log daily labor, contractor wages, materials). Can view daily shift collections. |
| **Admin** | Full system access. All CRUD permissions, user management (create staff logins), date-ranged financial audits (Profit & Loss, OTA commission vs. Net Payouts), and booking cancellations. |

---

## 3. Database Schema (PostgreSQL via Django ORM)

```text
+----------------+       +-------------------+       +-----------------+
|     Guest      |----<  |      Booking      |  >----+  BookingRoom    |
+----------------+       +-------------------+       +-----------------+
                         | - id (UUID)       |               |
                         | - check_in        |               v
                         | - check_out       |       +-----------------+
                         | - source          |       |      Room (11)  |
                         | - total_amount    |       +-----------------+
                         | - status          |
                         +-------------------+
                                  |
                                  v
                         +-------------------+
                         |      Payment      |
                         +-------------------+

```

### Models Specification

#### 1. `Room`

* `number`: String (Unique, e.g., "1" through "11").
* `is_active`: Boolean (Default: True).

#### 2. `Guest`

* `id`: UUID (Primary Key).
* `name`: String (max 255).
* `phone`: String (max 20, indexed).
* `aadhar_number`: String (max 20, nullable/optional).
* `created_at`: DateTime.

#### 3. `Booking`

* `id`: UUID (Primary Key).
* `guest`: ForeignKey (`Guest`, on_delete=PROTECT).
* `source`: Enum (`DIRECT`, `MMT`, `AGODA`, `BOOKING_COM`, `GOIBIBO`, `OTHER`).
* `ota_reference_id`: String (nullable, e.g., "NH75126513478242").
* `profile_tag`: String (nullable, e.g., "Family of 7", "Couple", "3 Gents", "Corporate").
* `check_in`: Date.
* `check_out`: Date.
* `status`: Enum (`CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`).
* `total_amount`: Decimal(10, 2) (Gross booking cost).
* `ota_commission`: Decimal(10, 2) (Default: 0.00, optional).
* `net_payout`: Decimal(10, 2) (Lodge's actual take-home revenue).
* `cancellation_reason`: Text (nullable).
* `created_at`: DateTime.

#### 4. `BookingRoom` (Junction Table for Multi-Room Bookings)

* Handles single bookings taking multiple rooms (e.g., Rooms 9 & 10 together).
* `booking`: ForeignKey (`Booking`, related_name="allocated_rooms").
* `room`: ForeignKey (`Room`, on_delete=PROTECT).

#### 5. `Payment`

* `id`: UUID (Primary Key).
* `booking`: ForeignKey (`Booking`, related_name="payments").
* `amount`: Decimal(10, 2).
* `payment_type`: Enum (`ADVANCE`, `SETTLEMENT`, `FULL`, `REFUND`).
* `payment_method`: Enum (`CASH`, `UPI`, `CARD`, `OTA_VCC`).
* `transaction_date`: DateTime (Auto-now-add).
* `recorded_by`: ForeignKey (`User`).

#### 6. `Expense`

* `id`: UUID (Primary Key).
* `date`: Date.
* `category`: Enum (`LABOR`, `MATERIALS`, `UTILITIES`, `MAINTENANCE`, `OTHER`).
* `job_details`: String (max 255, e.g., "2 putty walls bedroom, 3 roof remove").
* `worker_count`: Integer (nullable, e.g., 5).
* `paid_to`: String (max 100, e.g., "Natraj", "Jraj").
* `amount`: Decimal(10, 2).
* `materials_purchased`: String (max 255, nullable, e.g., "Kitchen roof sheets, Railing").
* `created_by`: ForeignKey (`User`).

---

## 4. Business Logic & Validation Constraints

1. **Double-Booking Prevention:** A room cannot be attached to an overlapping booking where `status IN ['CONFIRMED', 'CHECKED_IN']`.
* Overlap condition: `(new_check_in < existing_check_out) AND (new_check_out > existing_check_in)`.


2. **Dynamic Payments & Settlement:**
* Balance Due = `Booking.total_amount - SUM(Payment.amount)`.
* Check-in allows zero or partial payment (logged as `ADVANCE`).
* Check-out requires Balance Due to be zero, or flags an explicit manager override.


3. **Cancellation Release:** When a booking is marked `CANCELLED`, room allocation records remain linked for historical audit, but the double-booking query ignores cancelled records, freeing the room inventory instantly.
4. **Calculated Daily Occupancy:** For any target date, Room Occupancy Rate = `(Rooms Booked / 11) * 100`.

---

## 5. API Endpoints (DRF)

### Authentication

* `POST /api/auth/token/` (JWT obtain pair).
* `POST /api/auth/token/refresh/`.
* `GET /api/auth/me/` (Returns user role and profile).

### Operations (Receptionist / Manager / Admin)

* `GET /api/rooms/availability/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` (Returns status of all 11 rooms).
* `POST /api/bookings/` (Creates guest if new, reserves multi-room array, logs initial payment if provided).
* `GET /api/bookings/?status=CHECKED_IN` (Active stays).
* `PATCH /api/bookings/{id}/check-in/` (Changes status, updates timestamp).
* `PATCH /api/bookings/{id}/check-out/` (Validates payment balance, changes status).
* `POST /api/bookings/{id}/payments/` (Add advance or balance settlement).
* `PATCH /api/bookings/{id}/cancel/` (Cancels reservation and frees rooms).

### Finance & Expenses (Manager / Admin)

* `GET /api/expenses/` (Filtered by date range and category).
* `POST /api/expenses/` (Create labor or material expense record).

### Analytics & Reports (Admin Only)

* `GET /api/reports/financial-summary/?from=YYYY-MM-DD&to=YYYY-MM-DD`
* Returns: Total Booking Revenue, OTA Commissions, Net Payouts, Total Expenses (Split by Labor vs Materials), Net Operating Profit.


* `GET /api/reports/occupancy/?from=YYYY-MM-DD&to=YYYY-MM-DD`
* Returns: Total room nights sold, occupancy percentage per room.



---

## 6. Frontend Pages & UI Structure (Next.js)

* `/login`: Clean, simple authentication screen redirecting based on user role.
* `/dashboard` (Front Desk View):
* **Top Metrics:** Available Rooms Today, Expected Check-ins, Expected Check-outs.
* **11-Room Visual Matrix:** A horizontal 7-day or 14-day timeline. 11 rows (Rooms 1–11), columns for dates. Color-coded blocks by channel (Direct: Blue, Agoda/MMT: Purple/Green).
* **Quick Check-In Modal:** Fast-entry modal allowing room multi-select (checkboxes 1 to 11), Guest details, Source selection, and Dynamic Payment entry.


* `/bookings`: Searchable, paginated data table showing Guest, Rooms, Check-In, Check-Out, Source, Total, Balance, and Status.
* `/expenses` (Manager & Admin): Split table tracking Labor/Contractors (workers count, job details, wages) and Material purchases.
* `/reports` (Admin): Date-range picker with predefined filters (Today, This Week, This Month, Custom). Summary stat cards + Printable/Exportable P&L breakdown.

---

## 7. Step-by-Step AI Agent Execution Plan

Instruct your AI agent to follow these phases strictly. **Do not begin a phase until the previous phase is tested and passing.**

* **Phase 1: Backend Scaffolding & Database Setup**
* Initialize Django project with `djangorestframework`, `django-cors-headers`, `djangorestframework-simplejwt`, and `dj-database-url`.
* Configure PostgreSQL connection to Neon DB.
* Implement the 6 data models with migrations. Seed the 11 rooms (1 to 11).


* **Phase 2: Core Booking API & Overlap Validation**
* Implement serializers with validation to prevent double-booking.
* Build endpoints for guest intake, multi-room assignment, and payment records.
* Write automated tests verifying that overlapping dates for the same room are blocked with a `400 Bad Request`.


* **Phase 3: Expense & Reporting Modules**
* Build Manager Expense endpoints.
* Build Admin Financial Report endpoint aggregating income, OTA cuts, labor, and materials within a date filter.


* **Phase 4: Next.js Frontend Scaffolding & Auth**
* Set up Next.js app with Tailwind CSS and TanStack Query (React Query).
* Implement JWT token handling and route protection based on user roles.


* **Phase 5: Matrix UI, Intake Modals & Reports**
* Build the 11-room calendar visual grid.
* Integrate Quick Check-in and Checkout settlement modals.
* Implement the Admin Reports view with printable CSS styling.
