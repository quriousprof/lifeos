"""Life OS backend — FastAPI app.

Real Bitrefill agentic-commerce rails. Connectors (Gmail/Calendar/OAuth) stay mocked
in the frontend; this backend is the live commerce + (later) Zcash layer.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .bitrefill.client import BitrefillClient, BitrefillError
from .config import settings
from .routers import commerce, policy, webhooks


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


@app.get("/health", tags=["meta"])
async def health():
    """Self + Bitrefill connectivity + account balance."""
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
    except BitrefillError as exc:
        out["bitrefill"]["reachable"] = False
        out["bitrefill"]["error"] = str(exc)
    return out
