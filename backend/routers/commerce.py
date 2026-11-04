"""Agentic commerce endpoints — the propose/policy/execute/reconcile loop."""

from fastapi import APIRouter, HTTPException, Query

from bitrefill import service
from bitrefill.client import BitrefillError
from models import IntentRequest, IntentResult, IntentView, Product

router = APIRouter(tags=["commerce"])


@router.get("/products/search", response_model=list[Product])
async def search_products(
    q: str = Query(..., min_length=1),
    country: str | None = None,
    limit: int = 10,
    include_test: bool = False,
):
    try:
        return await service.search(q, country, limit, include_test)
    except BitrefillError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))


@router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    try:
        return await service.product(product_id)
    except BitrefillError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))


@router.post("/intents", response_model=IntentView)
async def propose_intent(req: IntentRequest):
    return service.propose(req.model_dump())


@router.get("/intents/{intent_id}", response_model=IntentResult)
async def get_intent(intent_id: str):
    try:
        return await service.intent_status(intent_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="intent not found")


@router.post("/intents/{intent_id}/execute", response_model=IntentResult)
async def execute_intent(intent_id: str):
    try:
        return await service.execute(intent_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="intent not found")
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except BitrefillError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))


@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    try:
        return await service.client.get_order(order_id)
    except BitrefillError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
