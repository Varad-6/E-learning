# TEMP — safe to delete after verifying migration (2026-07-10)
from app.database.session import SessionLocal
from sqlalchemy import text

def check():
    db = SessionLocal()
    try:
        res = db.execute(text("select column_name, data_type from information_schema.columns where table_name = 'course_modules'")).fetchall()
        print("course_modules columns:")
        for r in res:
            print(f"  {r[0]}: {r[1]}")
            
        res2 = db.execute(text("select column_name, data_type from information_schema.columns where table_name = 'courses'")).fetchall()
        print("\ncourses columns:")
        for r in res2:
            print(f"  {r[0]}: {r[1]}")
    finally:
        db.close()

if __name__ == '__main__':
    check()
