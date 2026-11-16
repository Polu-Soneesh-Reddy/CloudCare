def test_ai_triage_emergency_chest_pain(client):
    payload = {
        "patient_name": "John Doe",
        "age": 58,
        "symptoms": ["severe chest pain", "shortness of breath", "sweating"],
        "pain_level": 9,
        "systolic_bp": 175,
        "diastolic_bp": 98,
        "heart_rate": 115,
        "oxygen_saturation": 91,
        "temperature_c": 37.1,
        "chronic_conditions": ["Hypertension", "Type 2 Diabetes"],
    }
    response = client.post("/api/v1/ai/triage", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["urgency_tier"] == "EMERGENCY"
    assert data["urgency_score"] >= 70
    assert data["suggested_department"] in ["Cardiology", "Emergency / Trauma"]
    assert data["queue_priority_boost"] >= 30
    assert len(data["red_flags"]) > 0
    assert len(data["immediate_care_actions"]) > 0


def test_ai_triage_routine(client):
    payload = {
        "patient_name": "Jane Smith",
        "age": 28,
        "symptoms": ["mild rash on forearm", "slight itching"],
        "pain_level": 1,
        "systolic_bp": 118,
        "diastolic_bp": 76,
        "heart_rate": 72,
        "oxygen_saturation": 99,
        "temperature_c": 36.8,
        "chronic_conditions": [],
    }
    response = client.post("/api/v1/ai/triage", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["urgency_tier"] in ["ROUTINE", "PRIORITY"]
    assert data["suggested_department"] == "Dermatology"
    assert data["urgency_score"] < 45


def test_ai_no_show_prediction_high_risk(client):
    payload = {
        "patient_age": 32,
        "lead_time_days": 28,
        "previous_appointments": 4,
        "previous_no_shows": 3,
        "slot_hour": 8,
        "day_of_week": "Friday",
        "has_chronic_condition": False,
        "reminders_sent": 0,
    }
    response = client.post("/api/v1/ai/predict-no-show", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_tier"] == "HIGH"
    assert data["no_show_probability"] > 40.0
    assert len(data["risk_factors"]) > 0
    assert len(data["recommended_interventions"]) > 0


def test_ai_no_show_prediction_low_risk(client):
    payload = {
        "patient_age": 55,
        "lead_time_days": 1,
        "previous_appointments": 8,
        "previous_no_shows": 0,
        "slot_hour": 11,
        "day_of_week": "Tuesday",
        "has_chronic_condition": True,
        "reminders_sent": 2,
    }
    response = client.post("/api/v1/ai/predict-no-show", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_tier"] == "LOW"
    assert data["no_show_probability"] < 25.0
    assert len(data["protective_factors"]) > 0


def test_ai_soap_note_generation(client):
    payload = {
        "patient_name": "Robert Davis",
        "patient_age": 45,
        "chief_complaint": "Persistent productive cough with low-grade fever",
        "symptoms": ["cough", "fever", "mild fatigue"],
        "vitals": {
            "bp": "124/80",
            "hr": 84,
            "spo2": "97%",
            "temp": "38.2 C",
        },
        "clinical_observations": "Patient is in mild discomfort. Mild expiratory rhonchi heard at right base.",
        "duration_days": 4,
        "known_allergies": "Penicillin (causes rash)",
    }
    response = client.post("/api/v1/ai/generate-soap", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Robert Davis" in data["subjective"]
    assert "Penicillin" in data["subjective"]
    assert "Vitals" in data["objective"]
    assert "Assessment" in data or len(data["assessment"]) > 0
    assert len(data["differential_diagnoses"]) > 0
    assert len(data["plan"]) > 0


def test_ai_queue_insights(client):
    response = client.get("/api/v1/ai/queue-insights")
    assert response.status_code == 200
    data = response.json()
    assert "total_active_queue" in data
    assert "estimated_avg_wait_minutes" in data
    assert "system_load_status" in data
    assert "urgency_distribution" in data
    assert "ai_recommendations" in data
