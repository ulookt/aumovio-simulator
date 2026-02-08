from openai import OpenAI
import os
import json

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_driving_session(frames: list[dict]) -> dict:
    """Analyze telemetry frames and return structured coaching advice"""
    if not frames:
        return {
            "safety_score": 0,
            "aggression_score": 0,
            "analysis_text": "No data recorded.",
            "coach_tip": "Drive some distance to get analysis."
        }

    # 1. Feature Extraction
    max_speed = 0.0
    grass_frames = 0
    brake_while_turning_frames = 0
    total_speed = 0.0

    for f in frames:
        s = abs(f.get('speed', 0))
        inp = f.get('input', {})
        
        max_speed = max(max_speed, s)
        total_speed += s
        
        if 'Grass' in f.get('surface', ''):
            grass_frames += 1
            
        # Brake + Turn (steering angle check, or input left/right)
        is_turning = inp.get('left') or inp.get('right')
        is_braking = inp.get('down')
        if is_turning and is_braking and s > 5.0:
            brake_while_turning_frames += 1
    
    avg_speed = total_speed / len(frames)
    grass_percent = (grass_frames / len(frames)) * 100
    
    # 2. Construct Prompt
    prompt = f"""Analyze this human driving telemetry data and act as a professional racing coach.
    
    Stats:
    - Duration: {len(frames) / 10:.1f} sec
    - Max Speed: {max_speed:.1f} (Game Units ~ km/h)
    - Avg Speed: {avg_speed:.1f}
    - Time on Grass (Off-track): {grass_percent:.1f}%
    - Trail Braking events (Brake+Turn): {brake_while_turning_frames} frames
    
    Provide a response in JSON format with:
    - safety_score (0-100)
    - aggression_score (0-100)
    - analysis_text (Brief critique)
    - coach_tip (One specific actionable advice)
    """

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a racing instructor. Return JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=200,
            temperature=0.7
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"OpenAI Error: {e}")
        # Fallback
        return {
            "safety_score": 50,
            "aggression_score": 50,
            "analysis_text": "Could not contact AI Coach.",
            "coach_tip": "Check API Key configuration."
        }

def generate_scenario_insight(scenario_data: dict) -> str:
    """Generate AI insights about a scenario's risk factors"""
    prompt = f"""Analyze this autonomous driving test scenario and provide engineering insights about potential risks and challenges:

Weather: {scenario_data.get('weather')}
Time of Day: {scenario_data.get('time_of_day')}
Traffic Density: {scenario_data.get('traffic_density')} (0-1 scale)
Road Type: {scenario_data.get('road_type')}
Object Count: {scenario_data.get('object_count')}

Provide a brief technical analysis (2-3 sentences) covering:
1. Key risk factors in this environment
2. Perception challenges the AI model will face
3. Safety considerations"""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an AI safety engineer analyzing autonomous driving scenarios."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Insight generation unavailable: {str(e)}"

def generate_performance_insight(job_data: dict, metrics_data: dict) -> str:
    """Generate AI insights about training performance"""
    prompt = f"""Analyze this AI training job performance and provide engineering recommendations:

Compute Tier: {job_data.get('compute_tier')}
Epochs: {job_data.get('epochs')}
Final Loss: {metrics_data.get('final_loss', 'N/A')}
Final Accuracy: {metrics_data.get('final_accuracy', 'N/A')}
Detection Score: {metrics_data.get('detection_score', 'N/A')}

Scenario Context:
Weather: {job_data.get('weather')}
Traffic Density: {job_data.get('traffic_density')}

Provide a brief technical analysis (2-3 sentences) covering:
1. Performance quality assessment
2. Compute resource utilization
3. Recommendations for improvement"""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an ML engineer analyzing autonomous driving model training."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Insight generation unavailable: {str(e)}"

def generate_safety_insight(risk_data: dict, scenario_data: dict) -> str:
    """Generate AI insights about safety risks"""
    prompt = f"""Analyze these autonomous driving safety metrics and provide risk assessment:

Collision Probability: {risk_data.get('collision_probability', 0):.2%}
Pedestrian Risk: {risk_data.get('pedestrian_risk', 0):.2%}
Visibility Risk: {risk_data.get('visibility_risk', 0):.2%}
Overall Safety Score: {risk_data.get('safety_score', 0):.2f}/100

Scenario Context:
Weather: {scenario_data.get('weather')}
Time: {scenario_data.get('time_of_day')}
Traffic Density: {scenario_data.get('traffic_density')}

Provide a brief safety analysis (2-3 sentences) covering:
1. Critical safety concerns
2. Risk mitigation strategies
3. Validation recommendations"""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an autonomous vehicle safety analyst."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Insight generation unavailable: {str(e)}"
