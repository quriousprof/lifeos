"""Deterministic autonomy policy — the 'Guarantee' box.

The agent PROPOSES; this code DECIDES. Spend caps live here, never in a prompt.
Checks run in a fixed order; the first failure blocks the purchase.
"""

from typing import Any, Literal

PolicyResult = Literal["allowed", "blocked"]


def evaluate(
    amount_usd: float,
    merchant: str,
    category: str,
    policy: dict[str, Any],
) -> tuple[PolicyResult, str]:
    if policy.get("kill_switch"):
        return "blocked", "automation paused by kill switch"

    if policy.get("approval_mode") == "manual":
        return "blocked", "approval mode is manual — explicit approval required"

    per_tx = float(policy["per_tx_limit"])
    if amount_usd > per_tx:
        return "blocked", f"exceeds per-transaction limit of ${per_tx:.2f}"

    remaining = float(policy["monthly_budget"]) - float(policy["monthly_spent"])
    if amount_usd > remaining:
        return "blocked", f"exceeds remaining monthly budget (${remaining:.2f} left)"

    merchant_allow = [m.lower() for m in policy.get("merchant_allowlist", [])]
    if merchant.lower() not in merchant_allow:
        return "blocked", f'merchant "{merchant}" not in allowlist'

    category_allow = [c.lower() for c in policy.get("category_allowlist", [])]
    if category.lower() not in category_allow:
        return "blocked", f'category "{category}" not in allowlist'

    return "allowed", (
        f"within policy — ${amount_usd:.2f} to {merchant} ({category}); "
        f"${remaining:.2f} budget remaining"
    )
