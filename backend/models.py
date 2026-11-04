"""Request/response models for the Life OS backend API."""

from typing import Any, Literal

from pydantic import BaseModel, Field

ApprovalMode = Literal["auto", "conditional", "manual"]


class Policy(BaseModel):
    per_tx_limit: float
    monthly_budget: float
    monthly_spent: float
    merchant_allowlist: list[str]
    category_allowlist: list[str]
    approval_mode: ApprovalMode
    kill_switch: bool


class PolicyPatch(BaseModel):
    per_tx_limit: float | None = None
    monthly_budget: float | None = None
    monthly_spent: float | None = None
    merchant_allowlist: list[str] | None = None
    category_allowlist: list[str] | None = None
    approval_mode: ApprovalMode | None = None
    kill_switch: bool | None = None


class Package(BaseModel):
    id: str
    value: str
    amount_usd: float | None = None  # USD face value (from `amount`)
    price_sats: int | None = None  # cost in the invoice currency base units


class Product(BaseModel):
    id: str
    name: str
    country_code: str | None = None
    currency: str | None = None
    categories: list[str] = Field(default_factory=list)
    in_stock: bool = True
    image: str | None = None
    packages: list[Package] = Field(default_factory=list)
    price_range: dict[str, Any] | None = None


class IntentRequest(BaseModel):
    product_id: str
    package_id: str | None = None
    value: str | int | float | None = None
    quantity: int = 1
    merchant: str
    category: str
    amount_usd: float = Field(..., description="USD figure the policy caps against")
    trigger: str | None = None
    intent: str = Field("agentic purchase", description="why the agent is buying (required by Bitrefill search)")
    idempotency_key: str | None = None


class IntentView(BaseModel):
    id: str
    product_id: str
    package_id: str | None
    value: str | None
    quantity: int
    merchant: str
    category: str
    amount_usd: float
    trigger: str | None
    policy_result: Literal["allowed", "blocked"]
    policy_reason: str | None
    status: str
    invoice_id: str | None
    created_at: str


class OrderView(BaseModel):
    id: str
    status: str
    product_name: str | None = None
    value: str | None = None
    redemption_info: dict[str, Any] | None = None


class InvoiceView(BaseModel):
    id: str
    status: str
    payment_status: str | None
    orders: list[OrderView] = Field(default_factory=list)


class IntentResult(BaseModel):
    intent: IntentView
    invoice: InvoiceView | None = None


class AuditView(BaseModel):
    id: str
    actor: str
    action: str
    reason: str
    intent_id: str | None
    amount_usd: float | None
    payment_ref: str | None
    fulfillment_status: str | None
    result: str
    timestamp: str


# ── Gmail connector ─────────────────────────────────────────────────────────────
class Email(BaseModel):
    id: str
    sender: str
    subject: str
    date: str
    snippet: str
    body: str


class Trip(BaseModel):
    origin: str | None = None
    destination: str | None = None
    destination_country_code: str | None = None
    date_iso: str | None = None
    date_raw: str | None = None
    source_email_id: str | None = None
    matched_keywords: list[str] = Field(default_factory=list)
    actionable: bool = False


class GmailStatus(BaseModel):
    connected: bool
    email: str | None = None
    scopes: list[str] = Field(default_factory=list)


class GmailAuthUrl(BaseModel):
    auth_url: str


class GmailFetchResult(BaseModel):
    emails: list[Email] = Field(default_factory=list)
    trip: Trip | None = None
