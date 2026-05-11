import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import create_tables
from models import user, project, report, billing as billing_model  # ensure tables registered
from routers import auth, billing, dashboard, generate, github as github_router, projects, reports

app = FastAPI(title="AutoTest API", version="0.1.0", docs_url="/docs")

_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(generate.router, tags=["generate"])
app.include_router(reports.router, tags=["reports"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(billing.router, prefix="/billing", tags=["billing"])
app.include_router(github_router.router, prefix="/github", tags=["github"])


@app.on_event("startup")
async def on_startup() -> None:
    create_tables()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
