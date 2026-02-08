from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import RiskAnalysis, Job
from ..schemas import RiskAnalysisResponse
from uuid import UUID

router = APIRouter()

@router.get("/{job_id}", response_model=RiskAnalysisResponse)
def get_risk_analysis(job_id: UUID, db: Session = Depends(get_db)):
    """Get safety risk analysis for a specific job"""
    # Verify job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    risk = db.query(RiskAnalysis).filter(RiskAnalysis.job_id == job_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk analysis not found")
    
    return risk
