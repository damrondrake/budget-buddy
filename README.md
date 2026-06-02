# 💰 BudgetBuddy

**Take control of your money.** BudgetBuddy is a full-stack personal finance dashboard for tracking spending, budgets, income, and savings goals — all in one clean, responsive interface.

[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![Deployed on Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?logo=railway&logoColor=white)](https://railway.app/)

### 🔗 [**Live Demo →**](https://budget-buddy-app.com)

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

> 🚧 **Screenshots coming soon!** In the meantime, check out the [**live demo**](https://budget-buddy-app.com) to see BudgetBuddy in action.

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

## 🔑 Environment Variables

### Backend (Railway)

Set these in the Railway backend service under **Variables**:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Railway provides this automatically when you add a Postgres plugin). |
| `SECRET_KEY` | ✅ | Secret used to sign JWT access tokens. Use a long random string. |
| `CORS_ORIGINS` | ✅ | Comma-separated list of allowed frontend origins (e.g. your Vercel URL). |
| `RESEND_API_KEY` | ⬜ | [Resend](https://resend.com) API key for sending password-reset and partner-invite emails. **Without it, those emails are skipped** (the flows still work locally and return a debug token, but no email is sent in production). |
| `RESEND_FROM_EMAIL` | ⬜ | Sender address for outgoing emails. Defaults to Resend's shared sandbox (`BudgetBuddy <onboarding@resend.dev>`). Set to a verified-domain address (e.g. `BudgetBuddy <noreply@yourdomain.com>`) for production delivery. |
| `FRONTEND_URL` | ⬜ | Base URL used to build links in reset/invite emails. Defaults to the production site (`https://budget-buddy-app.com`). Set this so email links point at your deployed frontend. |

> **Note:** `RESEND_API_KEY` and `FRONTEND_URL` are needed for password reset and partner invite emails to work on the live site. If `RESEND_API_KEY` is unset, the API still responds successfully but no email is sent.

### Frontend (Vercel)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | ✅ | Base URL of the backend API (e.g. `https://your-backend.up.railway.app`). |

---

## 🗺️ Roadmap

Planned improvements for BudgetBuddy:

- 🤝 **Collaborative mode** — share a budget with a partner and work on your finances together in real time
- ⚡ **Performance improvements** — faster load times and optimized API queries
- 🔒 **Enhanced security** — additional hardening and security best practices

---

## 👤 Author

**Built by Drake Damron** · [GitHub →](https://github.com/damrondrake)
