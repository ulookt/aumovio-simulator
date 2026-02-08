from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Metric, Job
from ..schemas import MetricResponse
from typing import List
from uuid import UUID

router = APIRouter()

@router.get("/{job_id}", response_model=List[MetricResponse])
def get_job_metrics(job_id: UUID, db: Session = Depends(get_db)):
    """Get training metrics for a specific job"""
    # Verify job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    metrics = db.query(Metric).filter(Metric.job_id == job_id).order_by(Metric.epoch).all()
    return metrics
