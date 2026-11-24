"""Fix work_orders.assignee_id to allow NULL (pending work orders have no assignee yet)."""
from backend.database import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    conn.execute(text(
        "ALTER TABLE work_orders ALTER COLUMN assignee_id DROP NOT NULL"
    ))
    conn.commit()
    print("Fixed: assignee_id is now nullable")
    
    # Also check and fix detail / action NOT NULL if they might cause issues
    result = conn.execute(text(
        "SELECT column_name, is_nullable FROM information_schema.columns "
        "WHERE table_name='work_orders' AND is_nullable='NO' ORDER BY ordinal_position"
    ))
    print("Remaining NOT NULL columns:", [r[0] for r in result])
