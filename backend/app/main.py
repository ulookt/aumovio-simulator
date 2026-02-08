from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import scenarios, jobs, metrics, compute, risk, insights
from .database import engine, Base
import os

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Aumovio AI Compute Platform",
    description="Synthetic autonomous driving experimentation platform",
    version="1.0.0"
)

# CORS Configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(scenarios.router, prefix="/api/scenarios", tags=["Scenarios"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])
app.include_router(compute.router, prefix="/api/compute", tags=["Compute"])
app.include_router(risk.router, prefix="/api/risk", tags=["Risk"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])

@app.get("/")
def root():
    return {"message": "Aumovio AI Compute Platform API"}

@app.get("/health")
def health():
    return {"status": "healthy"}
