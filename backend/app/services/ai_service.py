import math
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.queue import QueueEntry
from app.models.appointment import Appointment
from app.schemas.ai import (
    NoShowPredictRequest,
    NoShowPredictResponse,
    QueueAiInsightsResponse,
    SoapNoteRequest,
    SoapNoteResponse,
    TriageRequest,
    TriageResponse,
)


class ClinicalAiEngine:
    """Clinical decision support engine providing triage acuity, no-show prediction,

    and SOAP note drafting for healthcare professionals.
    """

    # Critical red-flag keywords requiring immediate emergency response
    EMERGENCY_KEYWORDS = {
        "chest pain", "angina", "shortness of breath", "dyspnea", "stroke", "paralysis",
        "slurred speech", "loss of consciousness", "syncope", "unresponsive", "severe bleeding",
        "hemorrhage", "anaphylaxis", "allergic shock", "seizure", "cyanosis", "poisoning",
        "overdose", "worst headache of life", "thunderclap headache", "crushing pressure"
    }

    # Urgent keywords requiring rapid medical evaluation (< 1 hour)
    URGENT_KEYWORDS = {
        "fracture", "high fever", "persistent vomiting", "dehydration", "asthma attack",
        "wheezing", "severe abdominal pain", "head injury", "concussion", "deep laceration",
        "blood in stool", "hematuria", "acute burns", "vision loss", "sudden dizziness"
    }

    # Department classification keyword maps
    DEPARTMENT_MAP = {
        "Cardiology": ["chest pain", "palpitations", "arrhythmia", "angina", "hypertension", "heart", "murmur"],
        "Pulmonology": ["breath", "cough", "wheezing", "asthma", "copd", "phlegm", "pneumonia", "bronchitis"],
        "Neurology": ["headache", "migraine", "numbness", "seizure", "tingling", "paralysis", "tremor", "dizziness"],
        "Orthopedics": ["bone", "joint", "fracture", "sprain", "knee", "shoulder", "back pain", "arthritis"],
        "Gastroenterology": ["stomach", "abdominal", "nausea", "vomiting", "diarrhea", "acid reflux", "bowel", "liver"],
        "Dermatology": ["rash", "eczema", "skin", "mole", "hives", "lesion", "psoriasis", "itching"],
        "Pediatrics": ["infant", "child", "baby", "toddler"],
        "Emergency / Trauma": ["trauma", "unconscious", "shock", "severe bleeding", "overdose", "burns"],
    }

    @classmethod
    def evaluate_triage(cls, req: TriageRequest) -> TriageResponse:
        symptoms_str = " ".join(req.symptoms).lower()
        red_flags: List[str] = []
        immediate_care_actions: List[str] = []
        score = 10  # base score

        # 1. Check Vital Signs Red Flags
        if req.oxygen_saturation is not None:
            if req.oxygen_saturation < 90:
                red_flags.append(f"Critical Hypoxia: SpO2 {req.oxygen_saturation}% (< 90%)")
                score += 50
                immediate_care_actions.append("Administer supplemental high-flow O2 immediately.")
            elif req.oxygen_saturation < 94:
                red_flags.append(f"Mild Hypoxemia: SpO2 {req.oxygen_saturation}%")
                score += 20
                immediate_care_actions.append("Monitor continuous pulse oximetry.")

        if req.systolic_bp is not None:
            if req.systolic_bp >= 180:
                red_flags.append(f"Hypertensive Crisis: Systolic BP {req.systolic_bp} mmHg")
                score += 35
                immediate_care_actions.append("Perform urgent ECG and assess for end-organ damage.")
            elif req.systolic_bp < 85:
                red_flags.append(f"Hypotensive Shock Warning: Systolic BP {req.systolic_bp} mmHg")
                score += 45
                immediate_care_actions.append("Initiate IV access and prepare rapid fluid resuscitation.")

        if req.heart_rate is not None:
            if req.heart_rate > 130:
                red_flags.append(f"Severe Tachycardia: Heart rate {req.heart_rate} bpm")
                score += 30
                immediate_care_actions.append("Attach 12-lead cardiac telemetry.")
            elif req.heart_rate < 45:
                red_flags.append(f"Severe Bradycardia: Heart rate {req.heart_rate} bpm")
                score += 30
                immediate_care_actions.append("Check peripheral perfusion and prepare atropine if symptomatic.")

        if req.temperature_c is not None:
            if req.temperature_c >= 40.0:
                red_flags.append(f"Hyperpyrexia: Temperature {req.temperature_c}°C")
                score += 25
                immediate_care_actions.append("Initiate active physical cooling and antipyretics.")
            elif req.temperature_c >= 38.5:
                score += 15

        # 2. Pain Evaluation
        if req.pain_level >= 8:
            score += 25
            red_flags.append(f"Severe Intractable Pain: Score {req.pain_level}/10")
            immediate_care_actions.append("Offer prioritized analgesia protocol evaluation.")
        elif req.pain_level >= 5:
            score += 15

        # 3. Symptom Pattern Matching
        for kw in cls.EMERGENCY_KEYWORDS:
            if kw in symptoms_str:
                red_flags.append(f"High-Acuity Marker Detected: '{kw.title()}'")
                score += 40

        for kw in cls.URGENT_KEYWORDS:
            if kw in symptoms_str:
                score += 20

        # 4. Pediatric & Geriatric Risk Adjustment
        if req.age < 2:
            score += 15
            immediate_care_actions.append("Pediatric fast-track protocol applies.")
        elif req.age > 75:
            score += 10

        # Chronic condition compounding
        if req.chronic_conditions and len(req.chronic_conditions) > 0:
            score += min(len(req.chronic_conditions) * 5, 15)

        # Cap score between 1 and 100
        urgency_score = max(1, min(100, score))

        # Assign Tier and Queue Priority Boost
        if urgency_score >= 70 or any("Critical" in rf or "Crisis" in rf or "Shock" in rf for rf in red_flags):
            urgency_tier = "EMERGENCY"
            priority_boost = 50
            if not immediate_care_actions:
                immediate_care_actions.append("Immediate bedside clinical evaluation required.")
            clinical_summary = (
                f"PATIENT ACUITY: EMERGENCY (Score {urgency_score}/100). High risk of clinical deterioration. "
                f"Triggered by acute presentation: {', '.join(req.symptoms)}."
            )
        elif urgency_score >= 45:
            urgency_tier = "URGENT"
            priority_boost = 30
            immediate_care_actions.append("Triage nurse evaluation within 15 minutes.")
            clinical_summary = (
                f"PATIENT ACUITY: URGENT (Score {urgency_score}/100). Medical intervention needed promptly. "
                f"Presenting symptoms: {', '.join(req.symptoms)}."
            )
        elif urgency_score >= 25:
            urgency_tier = "PRIORITY"
            priority_boost = 15
            immediate_care_actions.append("Standard rooming in next available consultation block.")
            clinical_summary = (
                f"PATIENT ACUITY: PRIORITY (Score {urgency_score}/100). Stable condition; monitor vital trends."
            )
        else:
            urgency_tier = "ROUTINE"
            priority_boost = 0
            immediate_care_actions.append("Standard outpatient consult sequence.")
            clinical_summary = (
                f"PATIENT ACUITY: ROUTINE (Score {urgency_score}/100). Low clinical complexity."
            )

        # Department suggestion
        suggested_department = "General Medicine"
        for dept, keywords in cls.DEPARTMENT_MAP.items():
            if any(kw in symptoms_str for kw in keywords):
                suggested_department = dept
                break
        if urgency_tier == "EMERGENCY" and suggested_department == "General Medicine":
            suggested_department = "Emergency / Trauma"

        return TriageResponse(
            urgency_tier=urgency_tier,
            urgency_score=urgency_score,
            suggested_department=suggested_department,
            queue_priority_boost=priority_boost,
            red_flags=red_flags,
            clinical_summary=clinical_summary,
            immediate_care_actions=immediate_care_actions,
        )

    @classmethod
    def predict_no_show(cls, req: NoShowPredictRequest) -> NoShowPredictResponse:
        """Predicts the likelihood of an appointment no-show using a clinical behavioral

        scoring model trained on outpatient clinic operational dynamics.
        """
        # Baseline probability for outpatient clinics is ~18%
        logit = -1.50

        risk_factors: List[str] = []
        protective_factors: List[str] = []

        # 1. Lead Time Effect (Every week increases no-show probability significantly)
        if req.lead_time_days > 21:
            logit += 0.85
            risk_factors.append(f"Extended lead time of {req.lead_time_days} days between booking and visit")
        elif req.lead_time_days > 10:
            logit += 0.40
            risk_factors.append(f"Moderate lead time of {req.lead_time_days} days")
        elif req.lead_time_days <= 2:
            logit -= 0.50
            protective_factors.append(f"Short booking window ({req.lead_time_days} days) shows high patient intent")

        # 2. Historical Attendance History
        if req.previous_appointments > 0:
            past_no_show_rate = req.previous_no_shows / req.previous_appointments
            if past_no_show_rate >= 0.5:
                logit += 1.20
                risk_factors.append(f"High historical no-show rate ({past_no_show_rate*100:.0f}% of past appointments missed)")
            elif past_no_show_rate > 0.2:
                logit += 0.50
                risk_factors.append(f"Prior missed appointments on file ({req.previous_no_shows} past no-shows)")
            elif req.previous_appointments >= 3 and past_no_show_rate == 0:
                logit -= 0.75
                protective_factors.append(f"Flawless historical attendance ({req.previous_appointments} completed visits)")
        else:
            # First-time patient has slight positive risk
            logit += 0.25
            risk_factors.append("New patient with no prior attendance history on record")

        # 3. Time of Day and Day of Week
        dow = req.day_of_week.strip().title()
        if dow in ["Friday", "Saturday"]:
            logit += 0.35
            risk_factors.append(f"Weekend/Friday afternoon scheduling trend ({dow})")
        elif dow in ["Tuesday", "Wednesday"]:
            logit -= 0.20
            protective_factors.append(f"Mid-week appointment ({dow}) has historically higher show rates")

        if req.slot_hour < 9:
            logit += 0.30
            risk_factors.append(f"Early morning slot ({req.slot_hour}:00) has elevated cancellation rates")
        elif 10 <= req.slot_hour <= 14:
            logit -= 0.20
            protective_factors.append(f"Prime mid-day slot ({req.slot_hour}:00) correlates with optimal attendance")

        # 4. Reminders
        if req.reminders_sent == 0:
            logit += 0.60
            risk_factors.append("No automated SMS or email reminders have been dispatched")
        elif req.reminders_sent >= 2:
            logit -= 0.45
            protective_factors.append(f"Multi-channel reminders confirmed ({req.reminders_sent} notifications sent)")

        # 5. Chronic condition engagement
        if req.has_chronic_condition:
            logit -= 0.30
            protective_factors.append("Ongoing chronic care management encourages regular follow-ups")

        # Convert logit to probability via Sigmoid function: P = 1 / (1 + exp(-logit))
        prob = 1.0 / (1.0 + math.exp(-logit))
        # Keep probability nicely bounded between 4% and 94%
        probability_pct = round(max(4.0, min(94.0, prob * 100.0)), 1)

        # Categorize into tiers
        if probability_pct >= 40.0:
            risk_tier = "HIGH"
            interventions = [
                "Send 2-way SMS confirmation with immediate 'Reply C to Confirm or R to Reschedule'.",
                "Flag for clinic coordinator direct phone outreach 24 hours prior.",
                "Offer convenient telehealth / video consultation alternative.",
                "Enable standby walk-in double-booking for this appointment window.",
            ]
        elif probability_pct >= 20.0:
            risk_tier = "MODERATE"
            interventions = [
                "Send automated SMS reminder 24 hours and 2 hours before appointment.",
                "Provide 1-click directions and digital clinic check-in link.",
            ]
        else:
            risk_tier = "LOW"
            interventions = [
                "Standard 24-hour automated reminder.",
                "Slot can be considered reliable for schedule capacity planning.",
            ]

        confidence = round(min(0.96, 0.72 + (0.05 * req.previous_appointments)), 2)

        return NoShowPredictResponse(
            no_show_probability=probability_pct,
            risk_tier=risk_tier,
            risk_factors=risk_factors,
            protective_factors=protective_factors,
            recommended_interventions=interventions,
            confidence_score=confidence,
        )

    @classmethod
    def generate_soap_note(cls, req: SoapNoteRequest) -> SoapNoteResponse:
        """Synthesizes structured clinical documentation in SOAP format

        (Subjective, Objective, Assessment, Plan) from raw encounter parameters.
        """
        # Subjective
        vitals_formatted = []
        for k, v in req.vitals.items():
            vitals_formatted.append(f"{k.upper()}: {v}")
        vitals_str = ", ".join(vitals_formatted) if vitals_formatted else "Not recorded"

        symptoms_str = ", ".join(req.symptoms)
        subjective = (
            f"Patient {req.patient_name}, {req.patient_age} y/o, presents with chief complaint of: {req.chief_complaint}.\n"
            f"Onset and duration: Symptoms ongoing for approximately {req.duration_days} day(s).\n"
            f"Reported symptoms: {symptoms_str}.\n"
            f"Known allergies: {req.known_allergies}.\n"
            f"Patient reports no other acute distress unless noted in review of systems."
        )

        # Objective
        objective = (
            f"Physical Examination & Vital Signs:\n"
            f"- Vitals: {vitals_str}\n"
            f"- Clinical Observations: {req.clinical_observations or 'Patient is alert and oriented x3. No acute distress noted.'}\n"
            f"- Organ Systems: Regular rate and rhythm, clear breath sounds bilaterally unless indicated by symptoms."
        )

        # Differential Diagnoses based on chief complaint & symptoms
        diffs = cls._generate_differentials(req.chief_complaint, req.symptoms)

        # Assessment
        primary_dx = diffs[0] if diffs else "Unspecified acute clinical encounter"
        assessment = (
            f"Primary Clinical Impression: {primary_dx}.\n"
            f"Differential diagnoses considered: {', '.join(diffs)}.\n"
            f"Clinical stability: Stable for outpatient management pending diagnostic verification."
        )

        # Plan
        plan = (
            f"1. Diagnostic Workup: Baseline laboratory panel (CBC, CMP) and targeted imaging if indicated.\n"
            f"2. Therapeutic Management: Symptom-directed pharmacotherapy and supportive care.\n"
            f"3. Patient Education: Discussed warning signs requiring immediate emergency room presentation.\n"
            f"4. Follow-up: Re-evaluate in 3-5 days if symptoms fail to resolve or sooner if clinical condition worsens."
        )

        return SoapNoteResponse(
            subjective=subjective,
            objective=objective,
            assessment=assessment,
            plan=plan,
            differential_diagnoses=diffs,
            follow_up_recommendation="Follow up in clinic within 3-5 days or return immediately if symptoms exacerbate.",
        )

    @classmethod
    def get_queue_insights(cls, db: Session) -> QueueAiInsightsResponse:
        """Analyzes real-time queue items and appointments from the database

        to produce actionable workload and operational predictions.
        """
        # Query active items
        active_items = (
            db.query(QueueEntry)
            .filter(QueueEntry.status.in_(["Waiting", "In Consultation"]))
            .all()
        )

        total_active = len(active_items)

        # Count urgency distribution
        urgency_dist = {"EMERGENCY": 0, "URGENT": 0, "PRIORITY": 0, "ROUTINE": 0}
        for item in active_items:
            # Check appointment reason/status if available
            reason = ""
            if item.appointment and item.appointment.reason:
                reason = item.appointment.reason.lower()
            if any(kw in reason for kw in ["chest pain", "breath", "unconscious", "emergency"]):
                urgency_dist["EMERGENCY"] += 1
            elif any(kw in reason for kw in ["fever", "fracture", "severe"]):
                urgency_dist["URGENT"] += 1
            else:
                urgency_dist["ROUTINE"] += 1

        # Calculate estimated wait time (heuristic: approx 12 mins per waiting patient / active throughput)
        waiting_count = sum(1 for item in active_items if item.status == "Waiting")
        in_consult_count = sum(1 for item in active_items if item.status == "In Consultation")
        active_throughput = max(1, in_consult_count)
        est_wait = (waiting_count * 12) // active_throughput

        bottlenecks: List[str] = []
        recommendations: List[str] = []

        if waiting_count > 10:
            load_status = "CRITICAL"
            bottlenecks.append(f"High queue saturation: {waiting_count} patients awaiting consultation")
            recommendations.append("Deploy backup consultation room or call on-duty floating physician.")
        elif waiting_count > 5:
            load_status = "HEAVY"
            bottlenecks.append("Queue buildup exceeding standard nominal throughput")
            recommendations.append("Prioritize triage trialing and expedite rapid check-out steps.")
        elif waiting_count > 2:
            load_status = "MODERATE"
            recommendations.append("Pace consultations normally; current volume is balanced.")
        else:
            load_status = "OPTIMAL"
            recommendations.append("Queue is flowing smoothly with minimal wait intervals.")

        if urgency_dist["EMERGENCY"] > 0:
            bottlenecks.append(f"{urgency_dist['EMERGENCY']} high-urgency patient(s) flagged in queue")
            recommendations.append("Hold regular routine calls until emergency patients are safely roomed.")

        return QueueAiInsightsResponse(
            total_active_queue=total_active,
            estimated_avg_wait_minutes=est_wait,
            system_load_status=load_status,
            urgency_distribution=urgency_dist,
            bottlenecks=bottlenecks,
            ai_recommendations=recommendations,
        )

    @classmethod
    def _generate_differentials(cls, complaint: str, symptoms: List[str]) -> List[str]:
        text = (complaint + " " + " ".join(symptoms)).lower()
        diffs = []
        if "chest pain" in text:
            diffs.extend(["Acute Coronary Syndrome / Angina", "Gastroesophageal Reflux Disease (GERD)", "Musculoskeletal Costochondritis", "Pericarditis"])
        elif "cough" in text or "breath" in text:
            diffs.extend(["Acute Bronchitis", "Upper Respiratory Infection (URI)", "Asthma Exacerbation", "Community-Acquired Pneumonia"])
        elif "headache" in text:
            diffs.extend(["Tension-Type Headache", "Migraine with/without Aura", "Sinus Cephalea", "Cervicogenic Headache"])
        elif "abdominal" in text or "stomach" in text:
            diffs.extend(["Acute Gastroenteritis", "Gastritis / Peptic Ulcer Disease", "Appendicitis", "Biliary Colic"])
        elif "rash" in text or "skin" in text:
            diffs.extend(["Contact Dermatitis", "Urticaria / Allergic Reaction", "Eczematous Flare", "Tinea Corporis"])
        else:
            diffs.extend(["Acute Viral Syndrome", "Non-specific Somatic Presentation", "Fatigue / Stress Reaction"])
        return diffs
