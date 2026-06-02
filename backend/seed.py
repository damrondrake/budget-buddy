"""Convenience entrypoint so you can run `python seed.py` from the backend folder.

Seeds the local SQLite dev database with a known account:
    email:    drake@local
    password: password

Safe to run repeatedly — it skips creation if the account already exists.
"""
from app.seed import seed

if __name__ == "__main__":
    seed()
