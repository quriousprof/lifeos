"""Policy + kill-switch + audit endpoints."""

from fastapi import APIRouter

from .. import audit, db
from ..models import AuditView, Policy, PolicyPatch

router = APIRouter(tags=["policy"])


@router.get("/policy", response_model=Policy)
async def get_policy():
    return db.get_policy()


@router.put("/policy", response_model=Policy)
async def update_policy(patch: PolicyPatch):
    pol = db.get_policy()
    pol.update({k: v for k, v in patch.model_dump().items() if v is not None})
    db.save_policy(pol)
    audit.record("policy_updated", "autonomy policy changed by user", "success", actor="user")
    return pol


@router.post("/kill-switch", response_model=Policy)
async def toggle_kill_switch():
    pol = db.get_policy()
    pol["kill_switch"] = not pol.get("kill_switch", False)
    db.save_policy(pol)
    state = "engaged" if pol["kill_switch"] else "released"
    audit.record("kill_switch", f"kill switch {state}", "success", actor="user")
    return pol


@router.get("/audit", response_model=list[AuditView])
async def list_audit(limit: int = 100):
    return audit.list_events(limit)
