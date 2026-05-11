import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.project import Project
from ..models.user import User
from ..routers.auth import get_current_user

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    quality_gate_threshold: int = 80


class ProjectResponse(BaseModel):
    id: str
    name: str
    project_key: str
    quality_gate_threshold: int


@router.get("/", response_model=list[ProjectResponse])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProjectResponse]:
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    return [_to_response(p) for p in projects]


@router.post("/", response_model=ProjectResponse, status_code=201)
def create_project(
    body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectResponse:
    project = Project(
        owner_id=current_user.id,
        name=body.name,
        project_key=f"proj_{secrets.token_urlsafe(16)}",
        quality_gate_threshold=body.quality_gate_threshold,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_response(project)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    project = db.query(Project).filter(
        Project.id == project_id, Project.owner_id == current_user.id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()


def _to_response(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        project_key=project.project_key,
        quality_gate_threshold=project.quality_gate_threshold,
    )
