from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from models.project import Project
from models.report import FunctionResult, Report

router = APIRouter()


class FunctionResultInput(BaseModel):
    name: str
    file: str
    line: int
    status: str
    tests_generated: int
    tests_passed: int
    test_code: Optional[str] = None
    failure_output: Optional[str] = None


class SummaryInput(BaseModel):
    functions_scanned: int
    tests_generated: int
    tests_passed: int
    tests_failed: int
    coverage_percent: int


class ReportRequest(BaseModel):
    branch: str
    commit: str
    developer: str
    timestamp: str
    language: str
    plan: str
    summary: SummaryInput
    functions: list[FunctionResultInput]


@router.post("/report", status_code=201)
def submit_report(
    body: ReportRequest,
    x_project_key: str = Header(...),
    db: Session = Depends(get_db),
) -> dict:
    project = db.query(Project).filter(Project.project_key == x_project_key).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    threshold = project.quality_gate_threshold
    passed = body.summary.coverage_percent >= threshold
    status_str = "passed" if passed else "failed"

    report = Report(
        project_id=project.id,
        branch=body.branch,
        commit=body.commit,
        developer=body.developer,
        language=body.language,
        plan=body.plan,
        coverage_percent=body.summary.coverage_percent,
        tests_passed=body.summary.tests_passed,
        tests_failed=body.summary.tests_failed,
        status=status_str,
    )
    db.add(report)
    db.flush()

    for func in body.functions:
        db.add(FunctionResult(
            report_id=report.id,
            name=func.name,
            file=func.file,
            line=func.line,
            status=func.status,
            tests_generated=func.tests_generated,
            tests_passed=func.tests_passed,
            test_code=func.test_code,
            failure_output=func.failure_output,
        ))

    db.commit()
    return {"id": str(report.id), "status": status_str}
