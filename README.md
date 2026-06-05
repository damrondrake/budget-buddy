# 💰 BudgetBuddy

**Take control of your money.** BudgetBuddy is a full-stack personal finance dashboard for tracking spending, budgets, income, and savings goals — all in one clean, responsive interface.

[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![Deployed on Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?logo=railway&logoColor=white)](https://railway.app/)

### 🔗 [**Open the App →**](https://budget-buddy-app.com)

---

## 📖 About

BudgetBuddy is a full-stack personal finance dashboard built for real-world use. It helps people understand where their money goes by bringing transactions, category budgets, income, savings goals, and spending trends together in a single, intuitive view. The app supports multiple users — each with their own securely isolated data — making it a practical tool for anyone serious about managing their finances.

It's a live, hosted product — not a template or a starter kit. The source here documents what powers the app behind the scenes.

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

## 🚀 Use the App

BudgetBuddy is a live, hosted web app — there's nothing to install or configure. Open it in your browser, create a free account, and start tracking your money in minutes:

### 👉 [**budget-buddy-app.com**](https://budget-buddy-app.com)

Works on desktop and mobile.

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
**Reliability:** Sentry error tracking across frontend and backend · rate limiting · server-side validation · security headers

---

## 📸 Screenshots

> 🚧 **Screenshots coming soon!** In the meantime, open the [**live app**](https://budget-buddy-app.com) to see BudgetBuddy in action.

---

## ⚙️ Configuration

The backend service on **Railway** reads the following environment variables. Set
these in the Railway project (backend service → **Variables**):

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | JWT signing secret |
| `DATABASE_URL` | PostgreSQL connection string (injected by Railway) |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins |
| `RESEND_API_KEY` | Transactional email (password reset + partner invites) |
| `SENTRY_DSN` | Error tracking (optional) |
| `STRIPE_SECRET_KEY` | Stripe server-side secret key (`sk_live_…` / `sk_test_…`) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_…` / `pk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the billing webhook (`whsec_…`) |

The frontend (Vercel) additionally uses `VITE_API_URL`, `VITE_SENTRY_DSN`, and
`VITE_STRIPE_PUBLISHABLE_KEY`. Stripe keys are only required to enable billing —
when they're unset, billing endpoints return `503` and every feature stays
available to all users. **No payment card data is ever stored by BudgetBuddy;
Stripe handles all of it.**

---

## 🗺️ Roadmap

Planned improvements for BudgetBuddy:

- 🤝 **Collaborative mode** — share a budget with a partner and work on your finances together in real time
- ⚡ **Performance improvements** — faster load times and optimized API queries
- 🔒 **Enhanced security** — additional hardening and security best practices

---

## 👤 Author

**Built by Drake Damron** · [GitHub →](https://github.com/damrondrake)
