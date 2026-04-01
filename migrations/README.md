# Migrations

Numbered SQL files. Apply in order to a fresh Supabase Postgres database.
Never edit an existing migration — add a new one instead.

## Apply to Supabase

1. Get your Postgres connection string from Supabase:
   Project Settings → Database → Connection string → URI

2. Apply migrations in order:

```bash
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

3. The app's `init_db()` will seed data on first startup.

## File Naming

`NNN_description.sql` where NNN is zero-padded (001, 002, ...).
