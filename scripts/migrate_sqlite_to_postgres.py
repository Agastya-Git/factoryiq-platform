"""Copy a FactoryIQ SQLite database into an empty PostgreSQL database.

This migration is deliberately one-way and fail-closed: it never writes to the
SQLite source, refuses a non-PostgreSQL target, and refuses to overwrite any
existing application rows in the target database.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import MetaData, Table, create_engine, func, inspect, select, text
from sqlalchemy.engine import URL

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.database import Base, engine as target_engine  # noqa: E402


def fail(message: str) -> None:
    raise SystemExit(f"Migration stopped safely: {message}")


def table_count(connection, table) -> int:
    return int(connection.execute(select(func.count()).select_from(table)).scalar_one())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=ROOT / "factoryiq.db",
        help="SQLite file to copy (default: project-root/factoryiq.db)",
    )
    parser.add_argument(
        "--batch-size", type=int, default=2000, help="Rows per insert batch (default: 2000)"
    )
    args = parser.parse_args()

    source_path = args.source.expanduser().resolve()
    if not source_path.is_file():
        fail(f"SQLite source does not exist: {source_path}")
    if args.batch_size < 1:
        fail("batch size must be positive")
    if target_engine.dialect.name != "postgresql":
        fail("DATABASE_URL did not connect to PostgreSQL; the source database was not changed")

    source_url = URL.create(
        "sqlite+pysqlite",
        database=f"file:{source_path.as_posix()}",
        query={"mode": "ro", "uri": "true"},
    )
    source_engine = create_engine(source_url)
    target_tables = Base.metadata.sorted_tables
    target_names = {table.name for table in target_tables}

    try:
        source_inspector = inspect(source_engine)
        source_names = set(source_inspector.get_table_names())
        if source_names != target_names:
            missing = sorted(target_names - source_names)
            unexpected = sorted(source_names - target_names)
            fail(f"source schema differs from this app (missing={missing}, unexpected={unexpected})")

        # Create only the schema; the API is not imported, so its snapshot seeding
        # and telemetry startup hooks cannot run during this one-time transfer.
        Base.metadata.create_all(bind=target_engine)

        with source_engine.connect() as source, target_engine.connect() as target:
            source_tables = {
                name: Table(name, MetaData(), autoload_with=source_engine)
                for name in source_names
            }
            for table in target_tables:
                count = table_count(target, table)
                if count:
                    fail(f"target table {table.name!r} already contains {count} rows")

                source_columns = {column.name for column in source_tables[table.name].columns}
                target_columns = {column.name for column in table.columns}
                extras = sorted(source_columns - target_columns)
                if extras:
                    fail(f"table {table.name!r} has source columns this app cannot preserve: {extras}")

            expected_counts = {
                table.name: table_count(source, source_tables[table.name])
                for table in target_tables
            }

        with target_engine.begin() as target, source_engine.connect() as source:
            for table in target_tables:
                source_table = source_tables[table.name]
                result = source.execute(select(source_table))
                batch: list[dict] = []
                copied = 0
                for row in result.mappings():
                    batch.append({key: value for key, value in row.items() if key in table.c})
                    if len(batch) >= args.batch_size:
                        target.execute(table.insert(), batch)
                        copied += len(batch)
                        batch.clear()
                if batch:
                    target.execute(table.insert(), batch)
                    copied += len(batch)
                if copied != expected_counts[table.name]:
                    fail(f"row count changed while copying {table.name!r}")

            # Explicitly inserted SQLite IDs do not advance PostgreSQL sequences.
            if "telemetry_history" in target_names:
                max_id = target.execute(
                    text("SELECT MAX(id) FROM telemetry_history")
                ).scalar_one()
                if max_id is not None:
                    target.execute(
                        text(
                            "SELECT setval(pg_get_serial_sequence('telemetry_history', 'id'), :max_id, true)"
                        ),
                        {"max_id": int(max_id)},
                    )

        with target_engine.connect() as target:
            actual_counts = {table.name: table_count(target, table) for table in target_tables}
        if actual_counts != expected_counts:
            fail(f"post-copy row counts do not match (source={expected_counts}, target={actual_counts})")

        print("Migration completed. Source SQLite file was opened read-only.")
        for table in target_tables:
            print(f"  {table.name}: {actual_counts[table.name]} rows")
    finally:
        source_engine.dispose()


if __name__ == "__main__":
    main()
