import base64
import os
from typing import Optional

from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from models.user import Plan, User
from services.ai import generate_tests_for_functions
from services.plan_guard import require_usage_within_limit
from services.usage import increment_usage

router = APIRouter()

_ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "")


class FunctionInput(BaseModel):
    name: str
    file: str
    code: str


class GenerateRequest(BaseModel):
    language: str
    functions: list[FunctionInput]


class GeneratedTestItem(BaseModel):
    name: str
    test_code: str


class GenerateResponse(BaseModel):
    generated: list[GeneratedTestItem]


@router.post("/generate-tests", response_model=GenerateResponse)
def generate_tests(
    body: GenerateRequest,
    current_user: User = Depends(require_usage_within_limit),
    db: Session = Depends(get_db),
) -> GenerateResponse:
    enterprise_key = _decrypt_enterprise_key(current_user)

    functions = [{"name": f.name, "file": f.file, "code": f.code} for f in body.functions]
    generated = generate_tests_for_functions(body.language, functions, enterprise_key)

    increment_usage(db, str(current_user.id), len(generated))  # tests_generated = # functions; ai_calls += 1 (one push = one call)

    return GenerateResponse(
        generated=[GeneratedTestItem(name=g["name"], test_code=g["test_code"]) for g in generated]
    )


def _decrypt_enterprise_key(user: User) -> Optional[str]:
    if user.plan != Plan.enterprise or not user.enterprise_api_key_encrypted:
        return None
    if not _ENCRYPTION_KEY:
        return None
    try:
        fernet = Fernet(_ENCRYPTION_KEY.encode())
        return fernet.decrypt(user.enterprise_api_key_encrypted.encode()).decode()
    except Exception:
        return None
