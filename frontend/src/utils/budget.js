// Tailwind background class for a budget progress bar.
//
// The point is to distinguish "fully paid" (a success — e.g. you paid rent
// exactly) from "over budget" (a problem — e.g. you overspent on groceries):
//   - paid           → green   (confirmed paid, regardless of percentage)
//   - over budget    → red     (spent more than the limit, not yet confirmed)
//   - exactly 100%   → blue    (fully used, but not confirmed paid yet)
//   - 75–99%         → yellow
//   - under 75%      → green
//
// Shared by the Budgets page and the Dashboard so the two stay consistent.
const EPSILON = 0.005 // half a cent, to absorb floating-point noise

export function budgetBarColor({ spent, limit, paid }) {
  if (paid) return 'bg-emerald-500'
  if (!limit || limit <= 0) return 'bg-emerald-500'
  if (spent > limit + EPSILON) return 'bg-red-500' // genuinely over budget
  if (spent >= limit - EPSILON) return 'bg-blue-500' // exactly fully used
  const pct = (spent / limit) * 100
  if (pct >= 75) return 'bg-amber-500'
  return 'bg-emerald-500'
}

// True when spending has genuinely exceeded the limit (beyond rounding noise).
export function isOverBudget(spent, limit) {
  return limit > 0 && spent > limit + EPSILON
}
