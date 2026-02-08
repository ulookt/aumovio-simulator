import time
import random
import math
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Job, Metric, ComputeMetric, RiskAnalysis, Insight, Base
from app.services.openai_service import generate_performance_insight, generate_safety_insight
import os

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def simulate_job(job: Job, db: Session):
    """Simulate a training job with realistic metrics"""
    print(f"Starting simulation for job {job.id}")
    
    job.status = "running"
    db.commit()
    
    # Job runtime: 10-30 seconds based on epochs and complexity
    total_runtime = random.uniform(10, 30)
    time_per_epoch = total_runtime / job.epochs
    
    # Get scenario data for risk calculation
    scenario = job.scenario
    
    # Calculate base risk factors from scenario
    weather_risk = {"sunny": 0.1, "rain": 0.4, "fog": 0.7, "snow": 0.8}.get(scenario.weather.lower(), 0.3)
    time_risk = {"day": 0.2, "night": 0.5, "dawn": 0.4, "dusk": 0.4}.get(scenario.time_of_day.lower(), 0.3)
    traffic_risk = scenario.traffic_density * 0.5
    
    # Simulate training epochs
    for epoch in range(1, job.epochs + 1):
        # Generate realistic training metrics (exponential decay for loss, inverse for accuracy)
        base_loss = 2.5
        loss = base_loss * math.exp(-0.15 * epoch) + random.uniform(-0.05, 0.05)
        
        base_accuracy = 0.5
        accuracy = min(0.98, base_accuracy + (1 - base_accuracy) * (1 - math.exp(-0.2 * epoch))) + random.uniform(-0.02, 0.02)
        
        detection_score = min(0.95, accuracy * 0.9 + random.uniform(0, 0.1))
        
        # Store training metrics
        metric = Metric(
            job_id=job.id,
            epoch=epoch,
            loss=round(loss, 4),
            accuracy=round(accuracy, 4),
            detection_score=round(detection_score, 4)
        )
        db.add(metric)
        
        # Generate compute telemetry
        tier_utilization = {
            "small": (60, 75),
            "medium": (75, 90),
            "large": (85, 95)
        }
        gpu_range = tier_utilization.get(job.compute_tier.lower(), (70, 85))
        
        compute_metric = ComputeMetric(
            job_id=job.id,
            gpu_utilization=round(random.uniform(*gpu_range), 2),
            vram_usage=round(random.uniform(50, 95), 2),
            cpu_usage=round(random.uniform(30, 60), 2)
        )
        db.add(compute_metric)
        
        # Update job progress
        job.progress = round((epoch / job.epochs) * 100, 2)
        job.runtime_sec = round(epoch * time_per_epoch, 2)
        db.commit()
        
        # Sleep to simulate real training time
        time.sleep(time_per_epoch)
    
    # Generate final risk analysis
    collision_prob = min(0.95, (weather_risk + traffic_risk) * 0.5 * (1 - accuracy * 0.5))
    pedestrian_risk = min(0.95, (time_risk + weather_risk) * 0.4 * (1 - detection_score * 0.6))
    visibility_risk = min(0.95, weather_risk * (1 - accuracy * 0.4))
    safety_score = max(0, min(100, (1 - (collision_prob + pedestrian_risk + visibility_risk) / 3) * 100))
    
    risk_analysis = RiskAnalysis(
        job_id=job.id,
        collision_probability=round(collision_prob, 4),
        pedestrian_risk=round(pedestrian_risk, 4),
        visibility_risk=round(visibility_risk, 4),
        safety_score=round(safety_score, 2)
    )
    db.add(risk_analysis)
    db.commit()
    
    # Generate AI insights (only if OpenAI API key is configured)
    if os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_API_KEY") != "your_openai_api_key_here":
        try:
            # Performance insight
            job_data = {
                "compute_tier": job.compute_tier,
                "epochs": job.epochs,
                "weather": scenario.weather,
                "traffic_density": scenario.traffic_density
            }
            metrics_data = {
                "final_loss": loss,
                "final_accuracy": accuracy,
                "detection_score": detection_score
            }
            perf_insight_text = generate_performance_insight(job_data, metrics_data)
            
            perf_insight = Insight(
                job_id=job.id,
                insight_text=perf_insight_text
            )
            db.add(perf_insight)
            
            # Safety insight
            scenario_data = {
                "weather": scenario.weather,
                "time_of_day": scenario.time_of_day,
                "traffic_density": scenario.traffic_density
            }
            risk_data = {
                "collision_probability": collision_prob,
                "pedestrian_risk": pedestrian_risk,
                "visibility_risk": visibility_risk,
                "safety_score": safety_score
            }
            safety_insight_text = generate_safety_insight(risk_data, scenario_data)
            
            safety_insight = Insight(
                job_id=job.id,
                insight_text=safety_insight_text
            )
            db.add(safety_insight)
            db.commit()
            
            print(f"Generated AI insights for job {job.id}")
        except Exception as e:
            print(f"Failed to generate insights: {e}")
    else:
        # Fallback insights without OpenAI
        fallback_insight = Insight(
            job_id=job.id,
            insight_text=f"Job completed with {accuracy:.1%} accuracy. Safety score: {safety_score:.1f}/100. "
                        f"The model shows {'strong' if accuracy > 0.85 else 'moderate'} performance in "
                        f"{scenario.weather} conditions with {scenario.traffic_density:.0%} traffic density."
        )
        db.add(fallback_insight)
        db.commit()
    
    # Mark job as completed
    job.status = "completed"
    job.progress = 100.0
    job.runtime_sec = round(total_runtime, 2)
    db.commit()
    
    print(f"Completed simulation for job {job.id}")

def worker_loop():
    """Main worker loop that processes pending jobs"""
    print("Worker started. Polling for jobs...")
    
    while True:
        db = SessionLocal()
        try:
            # Find pending jobs
            pending_jobs = db.query(Job).filter(Job.status == "pending").all()
            
            for job in pending_jobs:
                simulate_job(job, db)
            
            db.close()
            
            # Poll every 2 seconds
            time.sleep(2)
            
        except Exception as e:
            print(f"Worker error: {e}")
            db.close()
            time.sleep(5)

if __name__ == "__main__":
    print("Initializing worker...")
    time.sleep(5)  # Wait for database to be ready
    worker_loop()
