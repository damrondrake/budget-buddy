# Row Level Security (RLS) Audit

_Last reviewed: 2026-06-04 — **Result: CLEAN, no issues found.**_

This document records a line-by-line review of every API endpoint to confirm
that each query touching user data is scoped to the authenticated account.

## How scoping works

Every data table carries an `account_id`. Two dependencies establish identity:

- **`get_current_account`** — resolves the *effective* account (the caller's own
  account, or a shared account they were invited to). Used by every data router
  so collaboration works while still scoping all reads/writes by `account.id`.
- **`get_token_account`** — the caller's *own* account straight from the JWT.
  Used only by `/api/auth/me` (identity display) and `DELETE /api/auth/account`
  (so a member can only erase their own account, never the owner's).

Resources that don't belong to the account simply don't match the `WHERE
account_id = :id` filter, so they return **404** — we intentionally do not return
403, to avoid confirming a resource exists.

## Endpoint-by-endpoint

Legend: ✅ scoped to `account_id`. Sub-resources note the parent + id checks.

### `auth` (`/api/auth`)
| Endpoint | Scoping |
| --- | --- |
| POST `/register`, POST `/login` | No cross-account surface (create/identity by email). |
| GET `/me` | Returns the caller's own `token_account`. ✅ |
| DELETE `/account` | Scoped to `token_account.id`; **no path param**, so it can only ever delete the caller's own account + their membership links. ✅ |
| POST `/forgot-password`, `/reset-password` | Keyed on a 32-byte secret token; generic responses don't reveal account existence. ✅ |
| POST `/invite`, `/accept-invite/*` | Invite token (secret) grants membership of the inviting account — the intended collaboration mechanism. ✅ |

### `transactions` (`/api/transactions`)
GET (list), POST, PUT `/{id}`, DELETE `/{id}` — every query filters
`Transaction.account_id == account.id`. POST validates the referenced category
and user belong to the account. Recurring helpers filter by `account_id`. ✅

### `budgets` (`/api/budgets`)
GET, POST (upsert), POST `/copy`, DELETE `/{id}`, PUT `/{id}/paid` — all filter
`Budget.account_id`. **Line items** (`/{budget_id}/items/{item_id}`) are
double-checked on `item id` + `budget_id` + `account_id`. ✅

### `income` (`/api/income`)
GET, POST, PUT `/{id}`, DELETE `/{id}` — filter `Income.account_id`. PUT/DELETE
also block the locked `starting_balance` row. ✅

### `recurring` (`/api/recurring`)
GET, POST, DELETE `/{id}`, POST `/apply`, POST `/apply-due` — every query
(including the generated transactions and dedupe lookups) filters `account_id`. ✅

### `savings` (`/api/savings`)
Goals filter `account_id` via `_get_goal_or_404`. **Allocations** are checked on
`alloc id` + `goal_id` + `account_id`. **Transactions** are created under a
verified goal and list by the verified `goal_id`; deposit `paid_by` is validated
against the account. ✅

### `categories` (`/api/categories`), `users` (`/api/users`)
GET filters `account_id`; DELETE/PUT filter `id` + `account_id`. ✅

### `account` / starting balance (`/api/account/starting-balance`)
GET/POST/DELETE all resolve via `_get_starting_balance(db, account.id)`. Keyed by
account, no path id — not cross-account addressable. ✅

### `summary` + `cumulative`, `trends`
Read-only aggregations; every underlying query filters `account_id`. ✅

### `changelog` (`/api/changelog/latest`)
**Global** announcement data (version, title, items, date) — contains **no user
data / no PII**. Auth is required for session consistency, but it would be safe
even if public. ✅

## Verification

Automated cross-account penetration tests live in
[`tests/test_security_rls.py`](tests/test_security_rls.py): two accounts are
created, one populates every resource type, and the other attempts every
read / create / update / delete using the first account's ids. Each targeted
operation returns 404 and collection reads never surface another account's data.
`DELETE /api/auth/account` is shown to affect only the caller. Unauthenticated
requests return 401.
