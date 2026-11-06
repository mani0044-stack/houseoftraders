"""
Idempotent schema reconciliation for deployments that already have tables.

``Base.metadata.create_all`` only creates *missing tables*; it never adds new
columns to an existing table. Production (Neon/PostgreSQL) kept failing with
"column does not exist" after model changes, so this module adds any column
that exists on a SQLAlchemy model but is missing from the live table.

The operation is safe to run on every startup:
* missing columns are added with ``ALTER TABLE ... ADD COLUMN``;
* existing columns are left untouched;
* failures are logged per-column and never crash the API process.
"""
import logging
from typing import List

from sqlalchemy import inspect, text

from backend.database.session import Base, engine as default_engine

logger = logging.getLogger("algotrade")


def ensure_schema(bind=None) -> List[str]:
  """
  Add model columns that are missing from the live database.

  Returns the list of ``table.column`` names that were added.
  """
  bind = bind or default_engine

  # Import models so every table is registered on Base.metadata.
  import backend.database.models  # noqa: F401

  added: List[str] = []
  inspector = inspect(bind)
  preparer = bind.dialect.identifier_preparer

  for table in Base.metadata.sorted_tables:
    if table.name.startswith("sqlite_"):
      continue
    try:
      if not inspector.has_table(table.name):
        continue
      existing = {col["name"] for col in inspector.get_columns(table.name)}
    except Exception as exc:
      logger.warning(
        "Schema inspection failed for table %s: %s", table.name, type(exc).__name__
      )
      continue

    missing = [column for column in table.columns if column.name not in existing]
    if not missing:
      continue

    for column in missing:
      try:
        column_type = column.type.compile(dialect=bind.dialect)
        table_name = preparer.quote(table.name)
        column_name = preparer.quote(column.name)
        statement = (
          f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
        )
        with bind.begin() as connection:
          connection.execute(text(statement))
        added.append(f"{table.name}.{column.name}")
        logger.info("Schema migration: added %s.%s", table.name, column.name)
      except Exception as exc:
        # A column added concurrently is fine; anything else is logged so the
        # API can still start and report the issue through /health.
        logger.warning(
          "Schema migration failed for %s.%s: %s: %s",
          table.name,
          column.name,
          type(exc).__name__,
          str(exc)[:200],
        )

  if added:
    logger.info("Schema reconciliation added %d column(s): %s", len(added), ", ".join(added))
  else:
    logger.info("Database schema verified: no missing columns.")
  return added
