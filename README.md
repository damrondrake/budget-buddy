# 💰 BudgetBuddy

**Take control of your money.** BudgetBuddy is a full-stack personal finance dashboard for tracking spending, budgets, income, and savings goals — all in one clean, responsive interface.

[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![Deployed on Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?logo=railway&logoColor=white)](https://railway.app/)

### 🔗 [**Live Demo →**](https://budget-buddy-lovat-nine.vercel.app)

---

## 📖 About

BudgetBuddy is a full-stack personal finance dashboard built for real-world use. It helps people understand where their money goes by bringing transactions, category budgets, income, savings goals, and spending trends together in a single, intuitive view. The app supports multiple users — each with their own securely isolated data — making it a practical tool for anyone serious about managing their finances.

---

## ✨ Features

- 📒 **Transaction tracking** — log expenses with categories, notes, and dates
- 🎯 **Category budgets** — set monthly budgets with detailed line items and **Mark as Paid** tracking
- 💵 **Income tracking** — record income from multiple sources
- 🔁 **Recurring transactions** — automate regular expenses and income
- 📈 **Spending trends** — visualize where your money goes with interactive charts
- 🏦 **Savings goals** — create goals with allocations and a full transaction log
- 📤 **CSV export** — download your data for offline analysis
- 🔐 **JWT authentication** — secure, token-based login
- 👥 **Per-user data isolation** — every user gets their own private, separated data
- 📱 **Responsive design** — looks and works great on mobile and desktop

---

## 🛠️ Tech Stack

| Frontend | Backend |
| --- | --- |
| React | FastAPI |
| Vite | SQLAlchemy |
| Tailwind CSS | Alembic |
| Recharts | PostgreSQL |
| React Router | JWT Auth (python-jose) |
| Axios | bcrypt |

**Hosting:** Vercel (frontend) · Railway (backend + database)

---

## 📸 Screenshots

> 🚧 **Screenshots coming soon!** In the meantime, check out the [**live demo**](https://budget-buddy-lovat-nine.vercel.app) to see BudgetBuddy in action.

---

## 🚀 Getting Started

Follow these steps to run BudgetBuddy locally.

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1. Clone the repo

```bash
git clone https://github.com/damrondrake/budget-buddy.git
cd budget-buddy
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env   # then edit .env with your database URL and settings

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
# Create a .env file and set:
#   VITE_API_URL=http://localhost:8000

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🗺️ Roadmap

Planned improvements for BudgetBuddy:

- 🤝 **Collaborative mode** — share a budget with a partner and work on your finances together in real time
- ⚡ **Performance improvements** — faster load times and optimized API queries
- 🔒 **Enhanced security** — additional hardening and security best practices

---

## 👤 Author

**Built by Drake Damron** · [GitHub →](https://github.com/damrondrake)
