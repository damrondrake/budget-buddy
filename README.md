# BudgetBuddy

A personal finance dashboard for tracking spending, income, and budgets between two people. Built as a monorepo with a React frontend and Python backend.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Recharts, React Router
- **Backend:** FastAPI, SQLAlchemy, Alembic
- **Database:** SQLite

## Features

- Track transactions with categories, split expenses, and notes
- Set monthly budgets per category with visual progress tracking
- Log income from multiple sources per user
- Dashboard with spending charts, budget progress bars, and split-expense balance
- Month-by-month navigation across all views
- Two-user system (Me and Partner) with automatic split-expense balancing

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python -m app.seed   # seeds default users and categories
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET/POST/PUT/DELETE | `/api/transactions` | Transaction CRUD |
| GET/POST | `/api/budgets` | Budget management (upsert) |
| GET | `/api/categories` | List categories |
| GET/POST/DELETE | `/api/income` | Income management |
| GET | `/api/summary/{month}/{year}` | Monthly summary with balances |
