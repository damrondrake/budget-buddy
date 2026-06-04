# BudgetBuddy — Data Map

_Last updated: June 4, 2026_

This document inventories the personal data BudgetBuddy stores, where it lives, and
who can access it. It supports our GDPR/CCPA obligations and should be kept current
as the schema evolves.

## Hosting & Infrastructure

| Aspect | Detail |
| --- | --- |
| Database engine | PostgreSQL (production), SQLite (local development only) |
| Hosting provider | [Railway](https://railway.app) |
| Region | United States |
| Backend | FastAPI service on Railway (US) |
| Frontend | Static SPA hosted on Vercel |
| Passwords | Hashed with bcrypt; never stored in plaintext |
| Transport | HTTPS/TLS in transit |
| Auth tokens | JWT (HS256), stored client-side in browser `localStorage` only |

We do **not** integrate with banks, payment processors, or third-party analytics/ad
networks. All financial data is entered manually by users. No personal data is sold
or shared with third parties.

## Data Subjects

- **Account owners** — people who register an account.
- **Invited members** — people invited to share an existing account (collaboration).

## Tables and PII

PII legend: 🔴 direct identifier · 🟠 sensitive financial data · 🟢 non-personal.

### `accounts`
The login identity for an account. **Contains PII and credentials.**

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `email` | string | 🔴 | Login email |
| `hashed_password` | string | 🔴 (credential) | bcrypt hash, never plaintext |
| `display_name` | string | 🔴 | User's chosen name |
| `reset_token` / `reset_token_expires` | string / datetime | 🟠 | Single-use password-reset token (1h expiry) |
| `invite_token` / `invite_token_expires` | string / datetime | 🟠 | Single-use partner-invite token (48h expiry) |

### `account_members`
Maps additional people (by email) to a shared account.

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `account_id` | int | 🟢 | The shared account |
| `user_email` | string | 🔴 | Member's email |
| `role` | string | 🟢 | `member` |
| `joined_at` | datetime | 🟢 | Timestamp |

### `users`
"Person slots" within an account (e.g. you and a partner) used to attribute
transactions and income.

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `name` | string | 🔴 | Person's display name |
| `account_id` | int | 🟢 | Owning account |

### `categories`
Spending categories. No personal data.

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `name` / `color` / `icon` | string | 🟢 | Labels/styling |
| `account_id` | int | 🟢 | Owning account |

### `transactions`
Individual expenses. **Financial activity.**

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `amount` | float | 🟠 | Expense amount |
| `category_id` | int | 🟢 | FK → categories |
| `paid_by` | int | 🟠 | FK → users (who paid) |
| `is_split` | bool | 🟢 | Split flag |
| `date` | date | 🟠 | Transaction date |
| `note` | string | 🟠 | Free-text note (may describe purchase) |
| `is_recurring` / `recurring_id` | bool / int | 🟢 | Recurrence linkage |
| `account_id` | int | 🟢 | Owning account |

### `budgets`
Monthly budget per category. **Financial.**

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `category_id` | int | 🟢 | FK → categories |
| `month` / `year` | int | 🟢 | Period |
| `amount_limit` | float | 🟠 | Budget cap |
| `note` | string | 🟠 | Free-text note |
| `paid` | bool | 🟢 | Paid flag |
| `account_id` | int | 🟢 | Owning account |

### `budget_line_items`
Line items within a budget. **Financial.**

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `budget_id` | int | 🟢 | FK → budgets |
| `label` | string | 🟠 | Item label |
| `amount` | float | 🟠 | Item amount |
| `account_id` | int | 🟢 | Owning account |

### `recurring_transactions`
Templates for recurring expenses. **Financial.**

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `amount` | float | 🟠 | Amount |
| `category_id` | int | 🟢 | FK → categories |
| `paid_by` | int | 🟠 | FK → users |
| `is_split` | bool | 🟢 | Split flag |
| `day_of_month` | int | 🟢 | Day to apply |
| `note` | string | 🟠 | Description (e.g. "Netflix") |
| `account_id` | int | 🟢 | Owning account |

### `income`
Income entries. **Financial.**

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `user_id` | int | 🟠 | FK → users (earner) |
| `amount` | float | 🟠 | Income amount |
| `source` | string | 🟠 | e.g. "Paycheck" |
| `month` / `year` | int | 🟢 | Period |
| `account_id` | int | 🟢 | Owning account |

### `savings_goals`
Savings goals. **Financial.**

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `account_id` | int | 🟢 | Owning account |
| `name` / `color` | string | 🟠 / 🟢 | Goal name / styling |
| `created_at` | datetime | 🟢 | Timestamp |

### `savings_allocations`
Sub-targets within a goal. **Financial.**

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `goal_id` | int | 🟢 | FK → savings_goals |
| `account_id` | int | 🟢 | Owning account |
| `label` | string | 🟠 | Allocation label |
| `target_amount` | float | 🟠 | Target |

### `savings_transactions`
Deposits/withdrawals against a goal. **Financial.**

| Column | Type | Classification | Notes |
| --- | --- | --- | --- |
| `id` | int | 🟢 | Primary key |
| `goal_id` | int | 🟢 | FK → savings_goals |
| `allocation_id` | int | 🟢 | FK → savings_allocations (nullable) |
| `account_id` | int | 🟢 | Owning account |
| `amount` | float | 🟠 | Amount |
| `type` | string | 🟢 | `deposit` or `withdrawal` |
| `note` | string | 🟠 | Free-text note |
| `date` | date | 🟠 | Date |

## Who Has Access

| Party | Access | Scope |
| --- | --- | --- |
| Account owner | Full read/write | Their own account's data (all tables scoped by `account_id`) |
| Invited members | Full read/write | The shared account they were invited to (resolved via `account_members`) |
| Application | Programmatic | Enforces per-request scoping so an account can only read/write its own `account_id` rows |
| Operators/Developers | Infrastructure | Railway project members with database access, for maintenance only |
| Third parties | **None** | Data is never sold or shared |

Every data table carries an `account_id`, and all API requests are scoped to the
caller's account (see `app/auth.py::get_current_account`). Members never gain access
to data outside the account they were invited to.

## Data Retention & Deletion

- Data is retained while an account is active.
- Users can permanently erase their account and **all** associated data at any time
  via **Settings → Delete My Account**, which calls `DELETE /api/auth/account`.
- That endpoint deletes every row owned by the account across all tables listed
  above (child rows first to satisfy foreign keys), removes the account's
  membership links, and deletes the `accounts` row itself. It is scoped to the
  caller's own account, so a member cannot delete the owner's data.
- Routine, time-limited infrastructure backups age out automatically.

## Privacy Contact

Privacy requests: **privacy@budget-buddy-app.com** _(placeholder)_
