from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ComputeMetric, Job
from ..schemas import ComputeMetricResponse
from typing import List
from uuid import UUID

router = APIRouter()

@router.get("/{job_id}", response_model=List[ComputeMetricResponse])
def get_compute_metrics(job_id: UUID, db: Session = Depends(get_db)):
    """Get compute telemetry for a specific job"""
    # Verify job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    compute_metrics = db.query(ComputeMetric).filter(ComputeMetric.job_id == job_id).order_by(ComputeMetric.timestamp).all()
    return compute_metrics
