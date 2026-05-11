from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.project import Project
from models.report import FunctionResult, Report
from models.user import User
from routers.auth import get_current_user
from services.ai import get_ai_suggestions

router = APIRouter()


@router.get("/{project_id}")
def get_dashboard(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    project = _get_owned_project(db, project_id, str(current_user.id))

    reports = (
        db.query(Report)
        .filter(Report.project_id == project.id)
        .order_by(Report.pushed_at.desc())
        .limit(30)
        .all()
    )

    history = [
        {"date": r.pushed_at.date().isoformat(), "percent": r.coverage_percent}
        for r in reversed(reports)
    ]

    current_cov = reports[0].coverage_percent if reports else 0
    prev_cov = reports[1].coverage_percent if len(reports) > 1 else current_cov
    trend = "up" if current_cov > prev_cov else ("down" if current_cov < prev_cov else "flat")

    file_coverage = _aggregate_file_coverage(db, str(project.id))
    low_coverage_files = [f["name"] for f in file_coverage if f["coverage"] < 60]

    suggestions = get_ai_suggestions({
        "name": project.name,
        "coverage_percent": current_cov,
        "low_coverage_files": low_coverage_files,
    })

    return {
        "project": {
            "name": project.name,
            "plan": current_user.plan,
            "quality_gate": reports[0].status if reports else "unknown",
            "quality_gate_threshold": project.quality_gate_threshold,
        },
        "coverage": {
            "current": current_cov,
            "previous": prev_cov,
            "trend": trend,
            "history": history,
        },
        "recent_pushes": [
            {
                "id": str(r.id),
                "developer": r.developer,
                "branch": r.branch,
                "commit": r.commit,
                "timestamp": r.pushed_at.isoformat(),
                "status": r.status,
                "coverage_percent": r.coverage_percent,
                "failed_functions": _get_failed_functions(db, str(r.id)),
            }
            for r in reports[:10]
        ],
        "files": file_coverage,
        "ai_suggestions": suggestions,
    }


def _get_failed_functions(db: Session, report_id: str) -> list[dict]:
    funcs = db.query(FunctionResult).filter(
        FunctionResult.report_id == report_id,
        FunctionResult.status == "failed",
    ).all()
    return [
        {
            "name": f.name,
            "file": f.file,
            "tests_generated": f.tests_generated,
            "tests_passed": f.tests_passed,
            "failure_output": _trim_output(f.failure_output),
        }
        for f in funcs
    ]


def _trim_output(output: str | None) -> str:
    """Keep only the most relevant lines from pytest output."""
    if not output:
        return ""
    relevant = []
    for line in output.split("\n"):
        if any(kw in line for kw in ("FAILED", "AssertionError", "Error", "assert", "short test")):
            relevant.append(line.strip())
    return "\n".join(relevant[:8])


def _get_owned_project(db: Session, project_id: str, user_id: str) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == user_id,
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _aggregate_file_coverage(db: Session, project_id: str) -> list[dict]:
    latest_report = (
        db.query(Report)
        .filter(Report.project_id == project_id)
        .order_by(Report.pushed_at.desc())
        .first()
    )
    if latest_report is None:
        return []

    funcs = db.query(FunctionResult).filter(FunctionResult.report_id == latest_report.id).all()
    by_file: dict[str, dict] = {}
    for func in funcs:
        if func.file not in by_file:
            by_file[func.file] = {"total": 0, "passed": 0}
        by_file[func.file]["total"] += func.tests_generated or 0
        by_file[func.file]["passed"] += func.tests_passed or 0

    result = []
    for file, counts in by_file.items():
        cov = int((counts["passed"] / counts["total"] * 100) if counts["total"] > 0 else 0)
        result.append({"name": file, "coverage": cov, "risk": _risk(cov)})
    return sorted(result, key=lambda x: x["coverage"])


def _risk(coverage: int) -> str:
    if coverage < 40:
        return "high"
    if coverage < 70:
        return "medium"
    return "low"
