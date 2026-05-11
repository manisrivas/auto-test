import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func

from db.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    branch = Column(String)
    commit = Column(String)
    developer = Column(String)
    language = Column(String)
    plan = Column(String)
    coverage_percent = Column(Integer)
    tests_passed = Column(Integer)
    tests_failed = Column(Integer)
    status = Column(String)  # passed | failed
    pushed_at = Column(DateTime(timezone=True), server_default=func.now())
    quality_checks = Column(Text, nullable=True)  # JSON array of quality issue objects


class FunctionResult(Base):
    __tablename__ = "function_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False)
    name = Column(String)
    file = Column(String)
    line = Column(Integer)
    status = Column(String)  # passed | failed
    tests_generated = Column(Integer)
    tests_passed = Column(Integer)
    test_code = Column(Text)
    failure_output = Column(Text, nullable=True)
