from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TriageRequest(BaseModel):
    patient_name: Optional[str] = "Anonymous Patient"
    age: int = Field(..., ge=0, le=130, description="Patient age in years")
    symptoms: List[str] = Field(..., min_items=1, description="List of presenting symptoms")
    pain_level: int = Field(0, ge=0, le=10, description="Pain score from 0 to 10")
    systolic_bp: Optional[int] = Field(None, ge=50, le=280, description="Systolic blood pressure (mmHg)")
    diastolic_bp: Optional[int] = Field(None, ge=30, le=180, description="Diastolic blood pressure (mmHg)")
    heart_rate: Optional[int] = Field(None, ge=30, le=240, description="Heart rate (bpm)")
    oxygen_saturation: Optional[int] = Field(None, ge=50, le=100, description="Oxygen saturation SpO2 (%)")
    temperature_c: Optional[float] = Field(None, ge=30.0, le=45.0, description="Body temperature in Celsius")
    chronic_conditions: Optional[List[str]] = Field(default_factory=list, description="Known chronic conditions")


class TriageResponse(BaseModel):
    urgency_tier: str  # EMERGENCY, URGENT, PRIORITY, ROUTINE
    urgency_score: int  # 1 to 100
    suggested_department: str
    queue_priority_boost: int  # 0 to 50
    red_flags: List[str]
    clinical_summary: str
    immediate_care_actions: List[str]


class NoShowPredictRequest(BaseModel):
    patient_age: int = Field(..., ge=0, le=130)
    lead_time_days: int = Field(..., ge=0, le=365, description="Days between scheduling and appointment date")
    previous_appointments: int = Field(0, ge=0)
    previous_no_shows: int = Field(0, ge=0)
    slot_hour: int = Field(..., ge=7, le=21, description="Hour of the appointment (24h format)")
    day_of_week: str = Field(..., description="Day of appointment (e.g., Monday, Friday)")
    has_chronic_condition: bool = False
    reminders_sent: int = Field(1, ge=0, le=10)


class NoShowPredictResponse(BaseModel):
    no_show_probability: float  # e.g., 28.5 (%)
    risk_tier: str  # HIGH, MODERATE, LOW
    risk_factors: List[str]
    protective_factors: List[str]
    recommended_interventions: List[str]
    confidence_score: float  # 0.0 to 1.0


class SoapNoteRequest(BaseModel):
    patient_name: str
    patient_age: int
    chief_complaint: str
    symptoms: List[str]
    vitals: Dict[str, Any] = Field(default_factory=dict)
    clinical_observations: Optional[str] = None
    duration_days: Optional[int] = 1
    known_allergies: Optional[str] = "No known drug allergies (NKDA)"


class SoapNoteResponse(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str
    differential_diagnoses: List[str]
    follow_up_recommendation: str


class QueueAiInsightsResponse(BaseModel):
    total_active_queue: int
    estimated_avg_wait_minutes: int
    system_load_status: str  # OPTIMAL, MODERATE, HEAVY, CRITICAL
    urgency_distribution: Dict[str, int]
    bottlenecks: List[str]
    ai_recommendations: List[str]
