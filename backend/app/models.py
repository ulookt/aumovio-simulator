from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .database import Base

class Scenario(Base):
    __tablename__ = "scenarios"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    weather = Column(String, nullable=False)
    time_of_day = Column(String, nullable=False)
    traffic_density = Column(Float, nullable=False)
    road_type = Column(String, nullable=False)
    object_count = Column(Integer, nullable=False)
    dataset_size_mb = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    jobs = relationship("Job", back_populates="scenario")

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("scenarios.id"), nullable=False)
    compute_tier = Column(String, nullable=False)
    epochs = Column(Integer, nullable=False)
    status = Column(String, default="pending")
    progress = Column(Float, default=0.0)
    runtime_sec = Column(Float, default=0.0)
    cost_estimate = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    scenario = relationship("Scenario", back_populates="jobs")
    metrics = relationship("Metric", back_populates="job", cascade="all, delete-orphan")
    compute_metrics = relationship("ComputeMetric", back_populates="job", cascade="all, delete-orphan")
    risk_analysis = relationship("RiskAnalysis", back_populates="job", uselist=False, cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="job", cascade="all, delete-orphan")

class Metric(Base):
    __tablename__ = "metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    epoch = Column(Integer, nullable=False)
    loss = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=False)
    detection_score = Column(Float, nullable=False)
    
    job = relationship("Job", back_populates="metrics")

class ComputeMetric(Base):
    __tablename__ = "compute_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    gpu_utilization = Column(Float, nullable=False)
    vram_usage = Column(Float, nullable=False)
    cpu_usage = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    job = relationship("Job", back_populates="compute_metrics")

class RiskAnalysis(Base):
    __tablename__ = "risk_analysis"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    collision_probability = Column(Float, nullable=False)
    pedestrian_risk = Column(Float, nullable=False)
    visibility_risk = Column(Float, nullable=False)
    safety_score = Column(Float, nullable=False)
    
    job = relationship("Job", back_populates="risk_analysis")

class Insight(Base):
    __tablename__ = "insights"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    insight_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    job = relationship("Job", back_populates="insights")
