from app.auth import hash_password
from app.database import SessionLocal
from app.models import Account, Category, User

DEV_EMAIL = "drake@local.dev"
DEV_PASSWORD = "password"
DEV_DISPLAY_NAME = "Drake"

DEFAULT_USERS = [
    {"name": "Drake"},
    {"name": "Carley"},
]

# Mirrors the default categories created on real account registration.
DEFAULT_CATEGORIES = [
    {"name": "Rent", "color": "#EF4444", "icon": "home"},
    {"name": "Utilities", "color": "#F59E0B", "icon": "zap"},
    {"name": "Groceries", "color": "#10B981", "icon": "shopping-cart"},
    {"name": "Gas", "color": "#6366F1", "icon": "fuel"},
    {"name": "Dining", "color": "#EC4899", "icon": "utensils"},
    {"name": "Entertainment", "color": "#8B5CF6", "icon": "film"},
    {"name": "Subscriptions", "color": "#14B8A6", "icon": "credit-card"},
    {"name": "Medical Expenses", "color": "#0EA5E9", "icon": "heart-pulse"},
    {"name": "Savings", "color": "#22C55E", "icon": "piggy-bank"},
    {"name": "Other", "color": "#6B7280", "icon": "more-horizontal"},
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(Account).filter(Account.email == DEV_EMAIL).first()
        if existing:
            print(f"Dev account '{DEV_EMAIL}' already exists (id={existing.id}); skipping.")
            return

        account = Account(
            email=DEV_EMAIL,
            hashed_password=hash_password(DEV_PASSWORD),
            display_name=DEV_DISPLAY_NAME,
        )
        db.add(account)
        db.flush()  # assign account.id

        for u in DEFAULT_USERS:
            db.add(User(account_id=account.id, **u))

        for c in DEFAULT_CATEGORIES:
            db.add(Category(account_id=account.id, **c))

        db.commit()
        print(
            f"Seeded dev account '{DEV_EMAIL}' (id={account.id}) with "
            f"{len(DEFAULT_USERS)} users and {len(DEFAULT_CATEGORIES)} categories."
        )
        print(f"Log in at http://localhost:5173 with {DEV_EMAIL} / {DEV_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
