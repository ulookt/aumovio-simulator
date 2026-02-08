import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

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
        response = openai.ChatCompletion.create(
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
