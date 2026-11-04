"""Async Bitrefill REST API v2 client.

Field names reflect the LIVE API (verified 2026-11-04), which differs from the
public docs in places:
  - product packages use `id` (not `package_id`), `value` is a string,
    `amount` is the USD face value, `price` is cost in the invoice currency base unit.
  - terminal invoice status is `all_delivered` (docs say `complete`);
    payment.status becomes `complete`; order.status becomes `delivered`.

The API key can spend on the account — it is read from settings (backend/.env) and
never logged or returned to clients.
"""

from typing import Any

import httpx

from ..config import settings

# Invoice statuses we treat as terminal (stop polling).
TERMINAL_INVOICE_STATUSES = {"all_delivered", "not_delivered", "complete", "denied", "payment_error"}
# Order statuses we treat as terminal.
TERMINAL_ORDER_STATUSES = {"delivered", "failed", "refunded"}


class BitrefillError(RuntimeError):
    def __init__(self, status_code: int, payload: Any):
        self.status_code = status_code
        self.payload = payload
        message = payload.get("message") if isinstance(payload, dict) else str(payload)
        super().__init__(f"Bitrefill {status_code}: {message}")


class BitrefillClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self._api_key = api_key or settings.bitrefill_api_key
        self._base_url = (base_url or settings.bitrefill_base_url).rstrip("/")

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def _request(self, method: str, path: str, **kwargs) -> Any:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(
                method, f"{self._base_url}{path}", headers=self._headers(), **kwargs
            )
        try:
            payload = resp.json()
        except ValueError:
            payload = {"message": resp.text}
        if resp.status_code >= 400 or (isinstance(payload, dict) and payload.get("error_code")):
            raise BitrefillError(resp.status_code, payload)
        return payload

    # ── Connectivity ──────────────────────────────────────────────────────────
    async def ping(self) -> str:
        payload = await self._request("GET", "/ping")
        return payload.get("message", "")

    async def balance(self) -> dict[str, Any]:
        payload = await self._request("GET", "/accounts/balance")
        return payload.get("data", {})

    # ── Products ──────────────────────────────────────────────────────────────
    async def search_products(
        self, query: str, country: str | None = None, limit: int = 10, include_test: bool = False
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"q": query, "limit": limit}
        if country:
            params["country"] = country
        if include_test:
            params["include_test_products"] = "true"
        payload = await self._request("GET", "/products/search", params=params)
        return payload.get("data", [])

    async def get_product(self, product_id: str) -> dict[str, Any]:
        payload = await self._request("GET", f"/products/{product_id}")
        return payload.get("data", {})

    # ── Invoices / Orders ─────────────────────────────────────────────────────
    async def create_invoice(
        self,
        products: list[dict[str, Any]],
        payment_method: str = "balance",
        auto_pay: bool = True,
        webhook_url: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "products": products,
            "payment_method": payment_method,
            "auto_pay": auto_pay,
        }
        if webhook_url:
            body["webhook_url"] = webhook_url
        payload = await self._request("POST", "/invoices", json=body)
        return payload.get("data", {})

    async def pay_invoice(self, invoice_id: str) -> dict[str, Any]:
        payload = await self._request("POST", f"/invoices/{invoice_id}/pay")
        return payload.get("data", payload)

    async def get_invoice(self, invoice_id: str) -> dict[str, Any]:
        payload = await self._request("GET", f"/invoices/{invoice_id}")
        return payload.get("data", {})

    async def get_order(self, order_id: str) -> dict[str, Any]:
        payload = await self._request("GET", f"/orders/{order_id}")
        return payload.get("data", {})
