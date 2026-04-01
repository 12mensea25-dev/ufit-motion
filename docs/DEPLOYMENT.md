# Deployment Guide

## Stack
- **App hosting:** Railway
- **Database:** Supabase (Postgres)

---

## Step 1: Supabase Setup

1. Create a free account at supabase.com
2. Create a new project (name it `ufit-motion`)
3. Go to: Project Settings → Database → Connection string → URI
4. Copy the URI — it looks like: `postgresql://postgres:[password]@[host]:5432/postgres`
5. Apply the schema:

```bash
psql "postgresql://..." -f migrations/001_initial_schema.sql
```

---

## Step 2: GitHub Setup

1. Push this repo to GitHub (create a new private repo)
2. Railway will connect to it

---

## Step 3: Railway Setup

1. Create a free account at railway.app
2. New Project → Deploy from GitHub repo → select this repo
3. Railway auto-detects Python + Procfile

4. Add environment variables in Railway dashboard:

| Variable | Value |
|---|---|
| `UFIT_SECRET_KEY` | Generate with: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | Your Supabase Postgres URI from Step 1 |
| `APP_ENV` | `production` |
| `UFIT_APP_BASE_URL` | Your Railway domain (e.g. `https://ufit-motion.up.railway.app`) |

5. Deploy → Railway builds and deploys automatically.

6. Visit your Railway domain. The app seeds itself on first start.

---

## Step 4: Verify

```bash
curl https://your-domain.up.railway.app/api/health
# Expected: {"ok": true}
```

Log in with:
- Admin: `admin` / `admin123`
- Coach: `coach1` / `coach123`

**Change these passwords immediately after first login.**

---

## Local Development

```bash
cp .env.example .env
# Edit .env — set UFIT_SECRET_KEY to any string
source .venv/bin/activate
python3 -m flask --app "app:create_app()" run --debug
```

Or with gunicorn:

```bash
gunicorn "app:create_app()" --bind 127.0.0.1:5000 --reload
```
