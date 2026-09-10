# Lodge Management System — Backend

Django 5.2 + DRF backend for the 11-room lodge. See [SPEC.md](SPEC.md) for the
full specification. Currently implements **Phase 1** (models, migrations, room
seeding) and **Phase 2** (serializers, booking overlap validation, core
endpoints, automated tests).

## Setup

```bash
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

## Migrate & seed rooms

```bash
python manage.py migrate
```

The 11 rooms are seeded automatically via the `core.0002_seed_rooms` data
migration. To (re)seed manually at any time:

```bash
python manage.py seed_rooms
```

## Create an admin user

```bash
python manage.py createsuperuser
```

Set the `role` field via `/admin/` or the shell to `ADMIN`, `MANAGER`, or
`RECEPTIONIST` (defaults to `RECEPTIONIST`).

## Run the server

```bash
python manage.py runserver
```

## Run tests

```bash
python manage.py test core
```

29 tests covering guest intake, multi-room bookings, initial payments, the
full double-booking overlap matrix, check-in/check-out/cancel lifecycle,
balance-due enforcement, and expense role permissions.

## API surface (Phase 1 & 2)

* `POST /api/auth/token/`, `POST /api/auth/token/refresh/`, `GET /api/auth/me/`
* `GET /api/rooms/availability/?start_date=&end_date=`
* `GET/POST /api/bookings/`, `GET /api/bookings/{id}/`
* `PATCH /api/bookings/{id}/check-in/`
* `PATCH /api/bookings/{id}/check-out/` (`{"override_balance": true}` to bypass balance check)
* `PATCH /api/bookings/{id}/cancel/`
* `POST /api/bookings/{id}/payments/`
* `GET/POST /api/expenses/` (Manager/Admin only)

Reporting endpoints (`/api/reports/...`) are part of Phase 3 and not yet
implemented.
