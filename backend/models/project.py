import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from ..db.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    project_key = Column(String, unique=True, nullable=False, index=True)
    quality_gate_threshold = Column(Integer, nullable=False, default=80)
    github_repo_full_name = Column(String, nullable=True)
    github_webhook_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
