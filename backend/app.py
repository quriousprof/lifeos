"""Life OS backend — FastAPI app.

Real Bitrefill agentic-commerce rails. Connectors (Gmail/Calendar/OAuth) stay mocked
in the frontend; this backend is the live commerce + (later) Zcash layer.
"""

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import db
from bitrefill.client import BitrefillClient, BitrefillError
from config import settings
from routers import commerce, connectors, policy, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Life OS Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(commerce.router)
app.include_router(policy.router)
app.include_router(webhooks.router)
app.include_router(connectors.router)


@app.get("/", tags=["meta"])
async def root():
    """FastAPI Cloud verifies the deployment against the root path."""
    return {
        "service": "Life OS Backend",
        "status": "ok",
        "health": "/health",
        "health_deep": "/health/deep",
        "docs": "/docs",
    }


@app.get("/health", tags=["meta"])
async def health():
    """Liveness probe: no external I/O, so readiness checks never time out."""
    return {"status": "ok"}


@app.get("/health/deep", tags=["meta"])
async def health_deep():
    """Readiness detail: self + Bitrefill connectivity + account balance."""
    out: dict = {"status": "ok", "bitrefill": {"configured": bool(settings.bitrefill_api_key)}}
    if not settings.bitrefill_api_key:
        out["bitrefill"]["reachable"] = False
        out["bitrefill"]["note"] = "BITREFILL_API_KEY not set"
        return out
    client = BitrefillClient()
    try:
        out["bitrefill"]["ping"] = await client.ping()
        out["bitrefill"]["balance"] = await client.balance()
        out["bitrefill"]["reachable"] = True
    except (BitrefillError, httpx.HTTPError) as exc:
        out["bitrefill"]["reachable"] = False
        out["bitrefill"]["error"] = str(exc)
    return out
