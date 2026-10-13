# eazyfoods

A marketplace for authentic African groceries and chef-made meals (eazyfoods.ca). Customers shop local African
stores and home chefs from one cart; vendors, chefs and drivers run their side from partner portals; admins and
marketing run the platform. An AI assistant (EazyBot) turns "what's for dinner?" into a filled cart.

> **Login is currently disabled everywhere (customer, mobile, vendor, chef, driver, admin, marketing).**
> The API trusts whoever calls it. Run it locally or on a private network only. See
> [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#login-free-mode) before deploying anything publicly.

## What's in the repo

| Path | What it is |
|---|---|
| `app/` | FastAPI backend (SQLAlchemy 2, Postgres). Endpoints are under `app/api/v1/endpoints/`, grouped by role. |
| `alembic/` | Database migrations. The baseline is generated from the models. |
| `tests/` | pytest suite (needs a Postgres database). |
| `scripts/seed_demo.py` | Seeds demo data: vendor, store, products, chef, driver, recipes. |
| `scripts/legacy/`, `db/legacy-sql/` | The old ad-hoc migration/setup scripts and SQL. Kept for reference; not maintained. |
| `frontend-customer/` | Customer web storefront (React 19, Vite, Tailwind) with an Android wrapper (Capacitor). |
| `frontend-app/` | Mobile app (React, Vite, Capacitor), including the EazyBot assistant screen. |
| `frontend-admin/` `frontend-vendor/` `frontend-chef/` `frontend-delivery/` `frontend-marketing/` | Partner and staff portals. |
| `frontend-portals/` | Landing page linking to the portals. |
| `docs/` | Architecture and setup guides. `docs/archive/` holds older notes. |
| `fliers/` | Value-proposition copy for customers, vendors, chefs and drivers. |

## Run it locally

Requirements: Python 3.11+, Node 20+, PostgreSQL 14+.

```bash
# 1. Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp env.template .env            # set DB_PASSWORD (and optionally ANTHROPIC_API_KEY)
createdb easyfoods

alembic upgrade head            # create the schema
python scripts/seed_demo.py     # optional demo data
uvicorn app.main:app --reload   # http://localhost:8000/api/docs

# 2. Customer storefront (any frontend-* folder works the same way)
cd frontend-customer && npm install
VITE_API_BASE_URL=http://localhost:8000/api/v1 npm run dev   # http://localhost:3003
```

Dev ports: customer 3003, admin 3002, vendor 3000. Each portal has its own `package.json`.

### Tests and CI

GitHub Actions (`.github/workflows/ci.yml`) runs pytest against Postgres, checks that `alembic upgrade head` applies
and matches the models, and builds all eight frontends.


```bash
TEST_DATABASE_URL=postgresql://postgres:<pw>@localhost:5432/easyfoods_test pytest
```

The test database is created if missing and wiped each run.

### Existing databases

If your database was created by the old scripts, adopt Alembic without changing data:
`alembic stamp head`. After that, change schema only via `alembic revision --autogenerate`.

## Configuration

Set in `.env` (see `env.template`). Everything is optional except the database.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` or `DB_HOST/PORT/NAME/USER/PASSWORD` | Postgres connection. |
| `ANTHROPIC_API_KEY`, `AI_MODEL` | Enables EazyBot, meal plans, semantic search, description generator. |
| `STRIPE_*`, `HELCIM_*` | Card payments and Stripe Connect payouts. |
| `CLOUDINARY_*` or `AWS_*`/`S3_BUCKET_NAME` | Image uploads (otherwise stored on local disk). |
| `CORS_ORIGINS` | Comma-separated frontend origins (default `*`). |
| `API_PUBLIC_URL` | Absolute base for uploaded image URLs. |

Frontends read `VITE_API_BASE_URL`.

## AI features

All under `/api/v1/ai`: `POST /chat` (EazyBot with product lookup and meal plans), `POST /meal-plan`,
`POST /search` (natural-language search to structured filters), `POST /generate-description`.
They return 503 / fall back gracefully when no `ANTHROPIC_API_KEY` is set.
On the web, any page can open the assistant with
`window.dispatchEvent(new CustomEvent('eazybot:ask', { detail: { message } }))`.
