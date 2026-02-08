
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Scenario, Job
from app.database import Base

# Adjust connection string if needed. Assuming default from previous context or docker-compose
# But since I'm running locally, I need the connection string.
# I'll try to read .env or use the one from main.py/database.py if available.
# Or just assume standard postgres url: postgresql://postgres:postgres@localhost:5432/aumovio

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/aumovio"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("--- Scenarios ---")
scenarios = db.query(Scenario).all()
for s in scenarios:
    print(f"ID: {s.id} | Weather: {s.weather} | Time: {s.time_of_day} | Traffic: {s.traffic_density}")

print("\n--- Jobs ---")
jobs = db.query(Job).all()
for j in jobs:
    scenario = db.query(Scenario).filter(Scenario.id == j.scenario_id).first()
    s_info = f"{scenario.weather}/{scenario.time_of_day}" if scenario else "None"
    print(f"Job ID: {j.id} | Scenario ID: {j.scenario_id} ({s_info}) | Tier: {j.compute_tier}")

db.close()
