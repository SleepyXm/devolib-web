# Devolib central PostgreSQL database

This directory now contains the complete database record that was missing from
the repository. The authoritative schema is the Alembic migration in
`migrations/versions/20260730_0001_initial_schema.py`.

For environments where Alembic cannot be used, `app/sql/bootstrap.sql` is a
standalone equivalent that also records the matching Alembic revision. Do not
run both initializers against the same empty database.

This database stores Devolib/LIDE's own accounts, project catalogue, detected
project metadata, runtime service configuration, and billing products. It is
separate from the `myapp` PostgreSQL database created inside each LIDE project
container.

## Fresh setup

From `app/backend` in PowerShell:

```powershell
.\setup.ps1
```

The script:

1. creates a Python 3.13 virtual environment;
2. installs every imported backend/test dependency;
3. generates `app/backend/.env` with local authentication/encryption keys;
4. starts an isolated PostgreSQL 18 container on port 5433; and
5. applies all Alembic migrations.

The host's existing PostgreSQL installation remains untouched. Database data is
kept in Compose's `devolib_postgres_data` volume (currently materialized as
`devolib-web_devolib_postgres_data`).

Useful migration commands:

```powershell
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic downgrade base
```

## Required tables and content

| Table | Purpose | Initial content |
|---|---|---|
| `users` | Password and GitHub OAuth accounts | Empty; signup/OAuth creates rows |
| `projects` | One central record per LIDE project/container | Empty; project creation creates rows |
| `project_metadata` | JSONB environment values, detected schema, pages, endpoints, and file groups | Empty; created with each project |
| `services` | Framework commands, ports, and scaffolding configuration | Seeded; application functionality depends on these rows |
| `project_services` | Many-to-many project/framework assignments plus optional command overrides | Empty; created with each project |
| `products` | Display price and Stripe Price mapping | Empty until real Stripe prices are configured |
| `alembic_version` | Current migration revision | Managed automatically by Alembic |

All application-generated identifiers are stored as 36-character strings
because the current Python code passes UUID values as strings through raw SQL.
Project access tokens are stored as 64-character SHA-256 hashes.

## Seeded service catalogue

The UI directly offers React, Next.js, FastAPI, Node.js, and PostgreSQL.
The import scanner can additionally detect Vue, Vanilla, Express, Flask, and
Actix, so all ten records are seeded. `default_packages` is JSON encoded text,
not JSONB, because the scaffolder passes it to `json.loads()`.

The service rows use fixed IDs so migration results are deterministic. They are
configuration data, not user content.

## Billing products

Do not add fake Stripe IDs: the checkout endpoint sends `stripe_price_id`
directly to Stripe. After creating Prices in the intended Stripe account, add
one row per visible plan:

```sql
INSERT INTO products (
  product_id,
  product_name,
  price,
  stripe_price_id
) VALUES (
  'replace-with-a-uuid',
  'Pro',
  20.00,
  'price_replace_with_real_stripe_price_id'
);
```

`price` is display content; Stripe remains the source of truth for the charge.
Set `STRIPE_SECRET_KEY` in `.env` before enabling checkout.

## Optional integration content

The database needs no rows for GitHub, Resend, DeepSeek, Cloudflare R2, or
Stripe credentials. Those belong in `.env`, never in SQL.

- GitHub OAuth needs `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
- Email verification needs `RESEND_API_KEY`.
- AI routes need `DEEPSEEK_API_KEY`.
- Checkout needs `STRIPE_SECRET_KEY` plus real `products` rows.
- project scaffolding needs the four `R2_*`/`CF_ACCOUNT_ID` values and the
  expected React, FastAPI, and LoggingService template objects in that bucket.

Without optional credentials, the database and core backend can still start;
the corresponding integration endpoints will not be usable.

## Backup and recovery

Back up the central database with:

```powershell
docker exec devolib-postgres pg_dump -U devolib -d devolib -Fc -f /tmp/devolib.dump
docker cp devolib-postgres:/tmp/devolib.dump .\devolib.dump
```

The migration recreates structure and framework configuration. A `pg_dump`
backup is still required to preserve actual users, projects, metadata, and
billing records.
