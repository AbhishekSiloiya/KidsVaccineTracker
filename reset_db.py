"""Utility script to reset (drop & recreate) the SQLite database.
Run with:  python reset_db.py
"""
from app import create_app, db  # type: ignore

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()
    print("Database dropped and recreated (fresh schema).")
