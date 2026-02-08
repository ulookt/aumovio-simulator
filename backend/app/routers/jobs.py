from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import Job, Scenario
from ..schemas import JobCreate, JobResponse
from typing import List
from uuid import UUID

router = APIRouter()

# Compute tier pricing
COMPUTE_TIERS = {
    "small": {"name": "T4 GPU", "vram": 8, "cost_per_hour": 0.5},
    "medium": {"name": "A100 GPU", "vram": 40, "cost_per_hour": 2.5},
    "large": {"name": "H100 GPU", "vram": 80, "cost_per_hour": 8.0}
}

@router.post("/", response_model=JobResponse)
def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    """Launch a new simulation job"""
    # Verify scenario exists
    scenario = db.query(Scenario).filter(Scenario.id == job_data.scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Calculate cost estimate
    tier = COMPUTE_TIERS.get(job_data.compute_tier.lower(), COMPUTE_TIERS["small"])
    estimated_time_hours = (job_data.epochs * 2) / 60  # Rough estimate
    cost_estimate = tier["cost_per_hour"] * estimated_time_hours
    
    db_job = Job(
        scenario_id=job_data.scenario_id,
        compute_tier=job_data.compute_tier,
        epochs=job_data.epochs,
        cost_estimate=round(cost_estimate, 2),
        status="pending"
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.get("/", response_model=List[JobResponse])
def list_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all jobs"""
    jobs = db.query(Job).options(joinedload(Job.scenario)).order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    
    # Calculate indices
    total_jobs = db.query(Job).count()
    
    # Get scenario indices map
    # Order by creation ASC so index 1 is oldest
    scenario_ids = db.query(Scenario.id).order_by(Scenario.created_at.asc()).all()
    scenario_map = {sid[0]: i + 1 for i, sid in enumerate(scenario_ids)}
    
    for i, job in enumerate(jobs):
        job.index = total_jobs - skip - i
        if job.scenario_id in scenario_map:
            job.scenario.index = scenario_map[job.scenario_id]
            
    return jobs

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    """Get a specific job by ID"""
    job = db.query(Job).options(joinedload(Job.scenario)).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
