from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Insight, Job
from ..schemas import InsightResponse
from typing import List
from uuid import UUID

router = APIRouter()

@router.get("/{job_id}", response_model=List[InsightResponse])
def get_insights(job_id: UUID, db: Session = Depends(get_db)):
    """Get AI-generated insights for a specific job"""
    # Verify job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    insights = db.query(Insight).filter(Insight.job_id == job_id).order_by(Insight.created_at).all()
    return insights

from ..schemas import DrivingSession, DrivingAdvice
from ..services.openai_service import analyze_driving_session

@router.post("/driving-session", response_model=DrivingAdvice)
def analyze_driving(session: DrivingSession):
    """Analyze a driving session and return AI coaching advice"""
    # Convert Pydantic list[TelemetryFrame] to list[dict]
    # Check if pydantic v2
    if hasattr(session.telemetry[0], 'model_dump'):
        frames = [f.model_dump() for f in session.telemetry]
    else:
        frames = [f.dict() for f in session.telemetry]
        
    result = analyze_driving_session(frames)
    return result
