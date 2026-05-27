from app.database import SessionLocal, engine, Base
from app.models import User, Category

DEFAULT_USERS = [
    {"name": "Me"},
    {"name": "Partner"},
]

DEFAULT_CATEGORIES = [
    {"name": "Rent", "color": "#EF4444", "icon": "home"},
    {"name": "Utilities", "color": "#F59E0B", "icon": "zap"},
    {"name": "Groceries", "color": "#10B981", "icon": "shopping-cart"},
    {"name": "Gas", "color": "#6366F1", "icon": "fuel"},
    {"name": "Dining", "color": "#EC4899", "icon": "utensils"},
    {"name": "Entertainment", "color": "#8B5CF6", "icon": "film"},
    {"name": "Subscriptions", "color": "#14B8A6", "icon": "credit-card"},
    {"name": "Other", "color": "#6B7280", "icon": "more-horizontal"},
]


def seed():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            for u in DEFAULT_USERS:
                db.add(User(**u))
            print(f"Seeded {len(DEFAULT_USERS)} users")

        if db.query(Category).count() == 0:
            for c in DEFAULT_CATEGORIES:
                db.add(Category(**c))
            print(f"Seeded {len(DEFAULT_CATEGORIES)} categories")

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
