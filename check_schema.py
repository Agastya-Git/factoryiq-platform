from backend.database import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT column_name, is_nullable, column_default FROM information_schema.columns "
        "WHERE table_name='work_orders' ORDER BY ordinal_position"
    ))
    for row in result:
        print(row)
