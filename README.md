# Lodge Management System

An 11-room lodge front-desk system: booking calendar, guest/companion intake,
payments, expenses, occupancy and financial reports, room management, and
staff/user administration. See [SPEC.md](SPEC.md) for the original
specification.

```
green_fields_stay/
├── backend/    Django 5.2 + DRF API (PostgreSQL via Neon)
├── frontend/   Next.js (App Router) + TypeScript + Tailwind
├── SPEC.md
└── README.md
```

## Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your Neon PostgreSQL connection
string:

```
SECRET_KEY=<random-secret>
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Without a `.env`/`DATABASE_URL`, the project falls back to a local
`db.sqlite3` file so it's runnable before Neon credentials are available.
`manage.py test` always runs against an in-memory SQLite database regardless
of `.env`, so the suite stays fast and never touches the real database.

### Migrate & seed rooms

```bash
python manage.py migrate
```

The 11 rooms are seeded automatically via the `core.0002_seed_rooms` data
migration. To (re)seed manually at any time:

```bash
python manage.py seed_rooms
```

### Create an admin user

```bash
python manage.py createsuperuser
```

Set the `role` field via `/admin/` or the shell to `ADMIN`, `MANAGER`, or
`RECEPTIONIST` (defaults to `RECEPTIONIST`). Once at least one Admin exists,
further staff accounts can be created from the app's `/users` page.

### Run the server

```bash
python manage.py runserver
```

### Run tests

```bash
python manage.py test core
```

108 tests covering guest/companion intake, multi-room bookings, the full
double-booking overlap matrix, check-in/check-out/cancel lifecycle,
balance-due enforcement, booking edits, room specifications, expense
category management, user management, and role-based permissions throughout.

## Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_BASE_URL if needed
npm run dev
```

Runs on http://localhost:3000 and expects the backend at
`http://127.0.0.1:8000` by default (see `NEXT_PUBLIC_API_BASE_URL` in
`.env.local`).

```bash
npm run build   # production build
npm run lint     # eslint
```

## API surface

* **Auth**: `POST /api/auth/token/`, `POST /api/auth/token/refresh/`, `GET /api/auth/me/`
* **Rooms**: `GET/POST /api/rooms/`, `PATCH /api/rooms/{id}/`, `GET /api/rooms/availability/?start_date=&end_date=` (Admin manages; all roles can read)
* **Bookings**: `GET/POST /api/bookings/`, `GET /api/bookings/{id}/`, `PATCH /api/bookings/{id}/` (Admin-only correction: amount, dates, source, tag)
  * `PATCH /api/bookings/{id}/check-in/`, `PATCH /api/bookings/{id}/check-out/` (`{"override_balance": true}` to bypass balance check)
  * `PATCH /api/bookings/{id}/cancel/` (Admin only), `POST /api/bookings/{id}/payments/`
* **Guests**: `GET /api/guests/?search=` (returning-guest lookup for the booking form)
* **Expenses**: `GET/POST /api/expenses/` (Manager/Admin), filterable by `from_date`, `to_date`, `category`
* **Expense categories**: `GET/POST /api/expense-categories/`, `PATCH /api/expense-categories/{id}/` (Admin manages; Manager/Admin can read)
* **Reports** (Admin only): `GET /api/reports/financial-summary/?from=&to=`, `GET /api/reports/occupancy/?from=&to=`
* **Users** (Admin only): `GET/POST /api/users/`, `PATCH /api/users/{id}/` (role, active status)
