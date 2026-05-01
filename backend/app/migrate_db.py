import logging
import os
import re
from pathlib import Path
from urllib.parse import quote
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from app.utils.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _safe_ident(name: str) -> str:
    if not re.match(r"^[A-Za-z0-9_]+$", name or ""):
        raise ValueError(f"Unsafe identifier: {name!r}")
    return name


def reset_database_if_requested(db_url: str) -> None:
    """
    Development-only DB reset.

    Set:
      RESET_DB=true

    Safety:
      - only runs when APP_ENV=development
      - refuses to drop remote DBs unless ALLOW_REMOTE_DB_RESET=true
    """
    settings = get_settings()
    app_env = (os.getenv("APP_ENV", settings.app_env) or "").lower()
    if app_env != "development":
        return

    if os.getenv("RESET_DB", "false").lower() != "true":
        return

    url = make_url(db_url)
    db_name = _safe_ident(url.database or "")
    host = (url.host or "").lower()

    allow_remote = os.getenv("ALLOW_REMOTE_DB_RESET", "false").lower() == "true"
    is_localish = host in {"localhost", "127.0.0.1", "postgres"}
    if not is_localish and not allow_remote:
        logger.error("Refusing to reset non-local DB host=%s db=%s (set ALLOW_REMOTE_DB_RESET=true to override).", host, db_name)
        return

    # Connect to postgres db for admin actions
    admin_url = url.set(database="postgres")
    admin_engine = create_engine(str(admin_url), isolation_level="AUTOCOMMIT")

    logger.warning("RESET_DB enabled: dropping and recreating database '%s' on host '%s'.", db_name, host)
    with admin_engine.connect() as conn:
        conn.execute(
            text(
                "SELECT pg_terminate_backend(pid) "
                "FROM pg_stat_activity "
                "WHERE datname = :db_name AND pid <> pg_backend_pid();"
            ),
            {"db_name": db_name},
        )
        conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}";'))
        conn.execute(text(f'CREATE DATABASE "{db_name}";'))


def run_alembic_upgrade() -> bool:
    try:
        from alembic import command  # type: ignore
        from alembic.config import Config  # type: ignore
    except Exception as exc:
        logger.info("Alembic not available (%s); skipping Alembic migrations.", exc)
        return False

    backend_dir = Path(__file__).resolve().parents[1]
    cfg_path = backend_dir / "alembic.ini"
    if not cfg_path.exists():
        logger.info("No alembic.ini found at %s; skipping Alembic migrations.", cfg_path)
        return False

    cfg = Config(str(cfg_path))
    command.upgrade(cfg, "head")
    return True


def log_users_columns(db_url: str) -> None:
    engine = create_engine(db_url)
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    "SELECT column_name "
                    "FROM information_schema.columns "
                    "WHERE table_schema='public' AND table_name='users' "
                    "ORDER BY ordinal_position;"
                )
            ).fetchall()
            logger.info("users columns: %s", [r[0] for r in rows])
    except Exception as exc:
        logger.warning("Could not verify users columns (non-fatal): %s", exc)


def migrate():
    settings = get_settings()
    # Support overriding DB URL for migration specifically if needed
    db_url = os.getenv("DATABASE_URL", settings.database_url)

    reset_database_if_requested(db_url)

    # Prefer Alembic (canonical schema management). If not available, fall back to lightweight ALTERs.
    if run_alembic_upgrade():
        log_users_columns(db_url)
        return

    engine = create_engine(db_url)
    
    queries = [
        text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL;"),
        text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NOT NULL DEFAULT 'free';"),
        text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user';"),
    ]
    
    try:
        with engine.connect() as conn:
            for query in queries:
                logger.info("Running migration: %s", str(query).strip())
                conn.execute(query)
            conn.commit()
            logger.info("Migration successful!")
        log_users_columns(db_url)
    except Exception as e:
        # We don't want to crash the whole container start if this fails 
        # (e.g. if the DB isn't ready yet), but in a real prod env you might.
        logger.error(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
