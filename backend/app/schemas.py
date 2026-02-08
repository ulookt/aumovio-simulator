from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID

# Scenario Schemas
class ScenarioCreate(BaseModel):
    weather: str
    time_of_day: str
    traffic_density: float
    road_type: str
    object_count: int
    dataset_size_mb: float = 100.0

class ScenarioResponse(BaseModel):
    id: UUID
    weather: str
    time_of_day: str
    traffic_density: float
    road_type: str
    object_count: int
    dataset_size_mb: float
    created_at: datetime

    class Config:
        from_attributes = True

# Job Schemas
class JobCreate(BaseModel):
    scenario_id: UUID
    compute_tier: str
    epochs: int

class JobResponse(BaseModel):
    id: UUID
    scenario_id: UUID
    compute_tier: str
    epochs: int
    status: str
    progress: float
    runtime_sec: float
    cost_estimate: float
    created_at: datetime

    class Config:
        from_attributes = True

# Metric Schemas
class MetricResponse(BaseModel):
    id: UUID
    job_id: UUID
    epoch: int
    loss: float
    accuracy: float
    detection_score: float

    class Config:
        from_attributes = True

# Compute Metric Schemas
class ComputeMetricResponse(BaseModel):
    id: UUID
    job_id: UUID
    gpu_utilization: float
    vram_usage: float
    cpu_usage: float
    timestamp: datetime

    class Config:
        from_attributes = True

# Risk Analysis Schemas
class RiskAnalysisResponse(BaseModel):
    id: UUID
    job_id: UUID
    collision_probability: float
    pedestrian_risk: float
    visibility_risk: float
    safety_score: float

    class Config:
        from_attributes = True

# Insight Schemas
class InsightResponse(BaseModel):
    id: UUID
    job_id: UUID
    insight_text: str
    created_at: datetime

    class Config:
        from_attributes = True
