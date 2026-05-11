"""
GitHub integration router.

POST /github/store-token   — store GitHub OAuth access token for user
GET  /github/repos         — list user's GitHub repos using stored token
POST /github/connect       — connect a GitHub repo (creates project + registers webhook)
POST /github/webhook       — receive push events from GitHub (public endpoint)
"""

import hashlib
import hmac
import json
import os
import uuid
import urllib.request
import urllib.error
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from models.project import Project
from models.user import User
from routers.auth import get_current_user

router = APIRouter()

GITHUB_API = "https://api.github.com"


# ── helpers ──────────────────────────────────────────────────────────────────

def _gh_get(path: str, token: str) -> Any:
    req = urllib.request.Request(
        f"{GITHUB_API}{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=f"GitHub API error: {e.reason}")


def _gh_post(path: str, token: str, payload: dict) -> Any:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{GITHUB_API}{path}",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise HTTPException(status_code=e.code, detail=f"GitHub API error: {body}")


# ── endpoints ─────────────────────────────────────────────────────────────────

class StoreTokenRequest(BaseModel):
    github_token: str
    github_username: str


@router.post("/store-token")
def store_github_token(
    body: StoreTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    current_user.github_access_token = body.github_token
    current_user.github_username = body.github_username
    db.commit()
    return {"ok": True}


@router.get("/repos")
def list_repos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list:
    if not current_user.github_access_token:
        raise HTTPException(status_code=400, detail="GitHub account not connected")

    # Get repos where user is owner or collaborator, up to 100
    repos = _gh_get("/user/repos?per_page=100&sort=updated&type=all", current_user.github_access_token)

    # Get already-connected repo names
    connected = {
        p.github_repo_full_name
        for p in db.query(Project).filter(Project.owner_id == str(current_user.id)).all()
        if p.github_repo_full_name
    }

    return [
        {
            "id": r["id"],
            "full_name": r["full_name"],
            "name": r["name"],
            "private": r["private"],
            "language": r.get("language"),
            "updated_at": r.get("updated_at"),
            "connected": r["full_name"] in connected,
        }
        for r in repos
    ]


class ConnectRepoRequest(BaseModel):
    repo_full_name: str   # "owner/repo"
    project_name: str


@router.delete("/disconnect")
def disconnect_github(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Remove stored GitHub token from the user account."""
    current_user.github_access_token = None
    current_user.github_username = None
    db.commit()
    return {"ok": True}


@router.post("/connect")
def connect_repo(
    body: ConnectRepoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not current_user.github_access_token:
        raise HTTPException(status_code=400, detail="GitHub account not connected")

    # Check not already connected
    existing = db.query(Project).filter(
        Project.owner_id == str(current_user.id),
        Project.github_repo_full_name == body.repo_full_name,
    ).first()
    if existing:
        return {"project_id": str(existing.id), "project_key": existing.project_key, "already_connected": True}

    # Create project
    project_key = f"proj_{uuid.uuid4().hex[:16]}"
    project = Project(
        owner_id=str(current_user.id),
        name=body.project_name,
        project_key=project_key,
        github_repo_full_name=body.repo_full_name,
        quality_gate_threshold=80,
    )
    db.add(project)
    db.flush()

    # Register webhook on GitHub
    webhook_url = os.environ.get("AUTOTEST_WEBHOOK_URL", "https://api.autotest.dev/github/webhook")
    webhook_secret = os.environ.get("GITHUB_WEBHOOK_SECRET", "autotest-webhook-secret")
    try:
        hook = _gh_post(
            f"/repos/{body.repo_full_name}/hooks",
            current_user.github_access_token,
            {
                "name": "web",
                "active": True,
                "events": ["push"],
                "config": {
                    "url": webhook_url,
                    "content_type": "json",
                    "secret": webhook_secret,
                    "insecure_ssl": "0",
                },
            },
        )
        project.github_webhook_id = str(hook.get("id", ""))
    except HTTPException:
        pass  # Webhook setup failed — project still created, analysis won't be automatic

    db.commit()
    return {
        "project_id": str(project.id),
        "project_key": project_key,
        "already_connected": False,
    }


@router.post("/webhook")
async def github_webhook(
    request: Request,
    x_github_event: str = Header(default=""),
    x_hub_signature_256: str = Header(default=""),
    db: Session = Depends(get_db),
) -> dict:
    """Receive push events from GitHub and trigger analysis."""
    body = await request.body()

    # Verify signature
    secret = os.environ.get("GITHUB_WEBHOOK_SECRET", "autotest-webhook-secret").encode()
    expected = "sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    if x_github_event != "push":
        return {"ok": True, "skipped": True}

    payload = json.loads(body)
    repo_full_name = payload.get("repository", {}).get("full_name", "")

    project = db.query(Project).filter(
        Project.github_repo_full_name == repo_full_name
    ).first()

    if not project:
        return {"ok": True, "skipped": True}

    # TODO: trigger full analysis job here (Phase 2)
    # For now just log the push
    return {"ok": True, "repo": repo_full_name, "project_id": str(project.id)}
