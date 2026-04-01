import os
import re
import socket
import sqlite3
from urllib.parse import urlparse, urlunparse

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    psycopg = None
    dict_row = None

POSTGRES_ID_TABLES = {
    "schools", "grades", "skills", "users", "pe_sessions",
    "session_results", "eod_reports", "comments", "incidents", "alerts",
}


class QueryResult:
    def __init__(self, rows=None, lastrowid=None):
        self._rows = rows or []
        self.lastrowid = lastrowid

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


def _supabase_pooler_dsn(dsn):
    """
    Convert a Supabase direct connection URL to a Session Pooler URL.
    Pooler endpoints are IPv4-reachable; direct endpoints resolve to IPv6 on some hosts.
    """
    parsed = urlparse(dsn)
    hostname = parsed.hostname or ""
    parts = hostname.split(".")
    # Only applies to URLs like db.{ref}.supabase.co
    if not (len(parts) >= 4 and parts[0] == "db" and "supabase" in parts):
        return None
    project_ref = parts[1]
    password = parsed.password or ""
    # Try pooler regions in order of likelihood
    for region in ("us-east-1", "us-west-1", "us-west-2", "eu-west-1",
                   "eu-central-1", "ap-southeast-1", "ap-northeast-1"):
        pooler_host = f"aws-0-{region}.pooler.supabase.com"
        try:
            socket.getaddrinfo(pooler_host, 6543, socket.AF_INET)
            user = f"postgres.{project_ref}"
            new_netloc = f"{user}:{password}@{pooler_host}:6543"
            new_dsn = urlunparse(parsed._replace(netloc=new_netloc))
            if "sslmode" not in new_dsn:
                new_dsn += "?sslmode=require"
            return new_dsn
        except OSError:
            continue
    return None


class PostgresConnection:
    def __init__(self, dsn):
        self.backend = "postgres"
        pooler = _supabase_pooler_dsn(dsn)
        try:
            self._connection = psycopg.connect(pooler or dsn, row_factory=dict_row)
        except Exception:
            if pooler:
                self._connection = psycopg.connect(dsn, row_factory=dict_row)
            else:
                raise

    def execute(self, query, params=None):
        params = () if params is None else params
        sql = self._convert_placeholders(query)
        normalized = query.lstrip().lower()
        insert_table = self._insert_table_name(normalized)
        should_return_id = (
            insert_table in POSTGRES_ID_TABLES
            and "returning" not in normalized
        )
        if should_return_id:
            sql += " RETURNING id"
        with self._connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall() if cursor.description else []
        lastrowid = rows[0]["id"] if should_return_id and rows else None
        return QueryResult(rows=rows, lastrowid=lastrowid)

    def executescript(self, script):
        for statement in script.split(";"):
            stmt = statement.strip()
            if stmt:
                self.execute(stmt)

    def commit(self):
        self._connection.commit()

    def rollback(self):
        self._connection.rollback()

    def close(self):
        self._connection.close()

    def _convert_placeholders(self, query):
        return query.replace("?", "%s")

    def _insert_table_name(self, normalized_query):
        match = re.match(r"insert\s+into\s+([a-z_][a-z0-9_]*)", normalized_query)
        return match.group(1) if match else None


def get_db(config=None):
    """Return a database connection. Caller must call .close() when done."""
    from flask import current_app
    cfg = config or current_app.config["UFIT_CONFIG"]

    if cfg.DATABASE_URL:
        if psycopg is None:
            raise RuntimeError(
                "Postgres support requires psycopg. Run: pip install -r requirements.txt"
            )
        return PostgresConnection(cfg.DATABASE_URL)

    connection = sqlite3.connect(cfg.DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def ensure_column(connection, table_name, column_name, column_definition):
    from flask import current_app
    cfg = current_app.config["UFIT_CONFIG"]
    if cfg.DATABASE_URL:
        connection.execute(
            f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS "
            f"{column_name} {column_definition}"
        )
        return
    columns = [
        row["name"]
        for row in connection.execute(
            f"PRAGMA table_info({table_name})"
        ).fetchall()
    ]
    if column_name not in columns:
        connection.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
        )
