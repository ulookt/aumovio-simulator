from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Scenario
from ..schemas import ScenarioCreate, ScenarioResponse
from typing import List
import random

router = APIRouter()

@router.post("/", response_model=ScenarioResponse)
def create_scenario(scenario: ScenarioCreate, db: Session = Depends(get_db)):
    """Generate a new synthetic driving scenario"""
    db_scenario = Scenario(**scenario.dict())
    db.add(db_scenario)
    db.commit()
    db.refresh(db_scenario)
    return db_scenario

@router.get("/", response_model=List[ScenarioResponse])
def list_scenarios(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all generated scenarios"""
    scenarios = db.query(Scenario).offset(skip).limit(limit).all()
    return scenarios

@router.get("/{scenario_id}", response_model=ScenarioResponse)
def get_scenario(scenario_id: str, db: Session = Depends(get_db)):
    """Get a specific scenario by ID"""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario
