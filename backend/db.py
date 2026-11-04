"""SQLite persistence: policy, intents, invoices, audit — the Life OS ledger.

One connection per process, row factory = dict. Tables are created on startup.
"""

import json
import sqlite3
import threading
from typing import Any

from config import settings

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.sqlite_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = _connect()
    return _conn


DEFAULT_POLICY = {
    "per_tx_limit": 20.0,
    "monthly_budget": 100.0,
    "monthly_spent": 0.0,
    "merchant_allowlist": ["bitrefill", "airalo", "amazon", "spotify", "google"],
    "category_allowlist": ["esim", "gift_card", "phone_refill", "subscription", "media"],
    "approval_mode": "auto",
    "kill_switch": False,
}


def init_db() -> None:
    conn = get_conn()
    with _lock:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS policy (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS intents (
                id TEXT PRIMARY KEY,
                idempotency_key TEXT UNIQUE NOT NULL,
                product_id TEXT NOT NULL,
                package_id TEXT,
                value TEXT,
                quantity INTEGER NOT NULL DEFAULT 1,
                merchant TEXT NOT NULL,
                category TEXT NOT NULL,
                amount_usd REAL NOT NULL,
                trigger TEXT,
                reason TEXT,
                policy_result TEXT NOT NULL,
                policy_reason TEXT,
                status TEXT NOT NULL,
                invoice_id TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                intent_id TEXT,
                status TEXT NOT NULL,
                payment_status TEXT,
                raw TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS audit (
                id TEXT PRIMARY KEY,
                actor TEXT NOT NULL,
                action TEXT NOT NULL,
                reason TEXT NOT NULL,
                intent_id TEXT,
                amount_usd REAL,
                payment_ref TEXT,
                fulfillment_status TEXT,
                result TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );
            """
        )
        row = conn.execute("SELECT data FROM policy WHERE id = 1").fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO policy (id, data) VALUES (1, ?)",
                (json.dumps(DEFAULT_POLICY),),
            )
        conn.commit()


def get_policy() -> dict[str, Any]:
    row = get_conn().execute("SELECT data FROM policy WHERE id = 1").fetchone()
    return json.loads(row["data"])


def save_policy(policy: dict[str, Any]) -> dict[str, Any]:
    conn = get_conn()
    with _lock:
        conn.execute("UPDATE policy SET data = ? WHERE id = 1", (json.dumps(policy),))
        conn.commit()
    return policy


def execute(sql: str, params: tuple = ()) -> None:
    conn = get_conn()
    with _lock:
        conn.execute(sql, params)
        conn.commit()


def query_one(sql: str, params: tuple = ()) -> dict[str, Any] | None:
    row = get_conn().execute(sql, params).fetchone()
    return dict(row) if row else None


def query_all(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    rows = get_conn().execute(sql, params).fetchall()
    return [dict(r) for r in rows]
