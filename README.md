# Aumovio AI Compute Platform

A full-stack synthetic autonomous driving experimentation platform that enables AI engineers to generate driving scenarios, execute simulation experiments, analyze training performance, evaluate safety risks, and receive AI-generated engineering insights.

## 🚀 Tech Stack

- **Backend**: FastAPI + Python + SQLAlchemy + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS + Recharts
- **Database**: PostgreSQL
- **AI**: OpenAI ChatGPT API
- **Infrastructure**: Docker + Docker Compose

## 📋 Features

### 1. Scenario Generator
Create synthetic autonomous driving environments with configurable parameters:
- Weather conditions (sunny, rain, fog, snow)
- Time of day (day, night, dawn, dusk)
- Traffic density
- Road type (city, highway)
- Object count

### 2. 2D Scene Simulation
Top-down Canvas visualization showing:
- Ego vehicle
- Traffic vehicles with animated movement
- Dynamic scenario playback

### 3. Compute Job Orchestration
Launch AI training jobs with:
- Multiple compute tiers (T4, A100, H100 GPU simulation)
- Configurable training epochs
- Real-time progress tracking
- Cost estimation

### 4. Metrics & Analytics
Visualize training performance:
- Training loss curves
- Accuracy progression
- Detection scores
- GPU/VRAM/CPU utilization
- Interactive Recharts dashboards

### 5. Safety Risk Analysis
Evaluate autonomous driving safety:
- Collision probability
- Pedestrian risk
- Visibility risk assessment
- Overall safety score (0-100)

### 6. AI-Powered Insights
ChatGPT-generated analysis covering:
- Performance quality assessment
- Compute resource optimization
- Safety recommendations
- Engineering best practices

## 🛠️ Setup Instructions

### Prerequisites

- Docker & Docker Compose
- OpenAI API key (optional, for AI insights)

### Quick Start

1. **Clone and navigate to the project**
   ```bash
   cd /Users/ulookt/Desktop/aumovio_simulator
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the platform**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Development Mode

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Worker:**
```bash
cd backend
python app/worker.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📊 Architecture

```
┌─────────────┐
│   Frontend  │ (React + Vite)
│  Port: 3000 │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Backend   │ (FastAPI)
│  Port: 8000 │
└──────┬──────┘
       │
       ├──────→ ┌─────────────┐
       │        │  PostgreSQL │
       │        │  Port: 5432 │
       │        └─────────────┘
       │
       └──────→ ┌─────────────┐
                │   Worker    │ (Background Job Simulator)
                └─────────────┘
                       │
                       ↓
                ┌─────────────┐
                │  OpenAI API │
                └─────────────┘
```

## 📚 Usage Guide

### 1. Create a Scenario
- Navigate to "Scenario Builder"
- Configure weather, time of day, traffic density, road type
- Click "Generate Scenario"

### 2. Visualize Scene
- Go to "Scene Simulation"
- Select your scenario from the dropdown
- Watch the 2D top-down visualization

### 3. Launch Training Job
- Navigate to "Jobs Dashboard"
- Click "+ Launch New Job"
- Select scenario, compute tier, and epochs
- Submit the job

### 4. Monitor Progress
- Jobs auto-refresh every 3 seconds
- Watch progress bars update in real-time
- Jobs complete in 10-30 seconds

### 5. Analyze Results
- **Metrics & Analytics**: View loss curves, accuracy, GPU utilization
- **Safety Risk**: Check collision probability, pedestrian risk, safety score
- **AI Insights**: Read ChatGPT-generated recommendations

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://aumovio:aumovio_pass@postgres:5432/aumovio_platform

# OpenAI (optional)
OPENAI_API_KEY=your_api_key_here

# CORS
CORS_ORIGINS=http://localhost:3000
```

### Compute Tiers

| Tier   | GPU  | VRAM  | Cost/Hour |
|--------|------|-------|-----------|
| Small  | T4   | 8GB   | $0.50     |
| Medium | A100 | 40GB  | $2.50     |
| Large  | H100 | 80GB  | $8.00     |

## 🧪 API Endpoints

### Scenarios
- `POST /api/scenarios/` - Create scenario
- `GET /api/scenarios/` - List scenarios
- `GET /api/scenarios/{id}` - Get scenario

### Jobs
- `POST /api/jobs/` - Launch job
- `GET /api/jobs/` - List jobs
- `GET /api/jobs/{id}` - Get job

### Analytics
- `GET /api/metrics/{job_id}` - Training metrics
- `GET /api/compute/{job_id}` - Compute telemetry
- `GET /api/risk/{job_id}` - Safety risk analysis
- `GET /api/insights/{job_id}` - AI insights

## 🎨 Features Highlights

✅ **Enterprise Dark Theme** - Modern, professional UI design  
✅ **Real-time Updates** - Auto-refreshing job progress  
✅ **Interactive Charts** - Recharts visualizations  
✅ **2D Animation** - Canvas-based scene rendering  
✅ **AI Integration** - ChatGPT-powered insights  
✅ **Docker Ready** - One-command deployment  
✅ **PostgreSQL** - Production-ready database  
✅ **RESTful API** - Clean, documented endpoints  

## 📝 Notes

- **No Real GPU Required**: All compute metrics are simulated
- **Demo-Friendly**: Jobs complete in 10-30 seconds
- **Synthetic Data**: Training curves follow realistic patterns
- **Production Structure**: Enterprise-grade architecture
- **Interview Ready**: Showcases full-stack proficiency

## 🤝 Contributing

This is a demo project for technical interviews. Feel free to fork and customize!

## 📄 License

MIT License - feel free to use for your portfolio or interviews.

---

**Built with ❤️ for autonomous AI engineering**
