from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.ai import (
    NoShowPredictRequest,
    NoShowPredictResponse,
    QueueAiInsightsResponse,
    SoapNoteRequest,
    SoapNoteResponse,
    TriageRequest,
    TriageResponse,
)
from app.services.ai_service import ClinicalAiEngine

router = APIRouter(prefix="/ai", tags=["clinical-ai"])


@router.post("/triage", response_model=TriageResponse, status_code=status.HTTP_200_OK)
def triage_patient(request: TriageRequest):
    """Clinical triage evaluation that assesses acuity tier, urgency score,

    red flags, suggested medical department, and queue priority boost.
    """
    try:
        return ClinicalAiEngine.evaluate_triage(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clinical triage engine failure: {str(exc)}"
        )


@router.post("/predict-no-show", response_model=NoShowPredictResponse, status_code=status.HTTP_200_OK)
def predict_no_show_risk(request: NoShowPredictRequest):
    """Predicts patient appointment no-show probability and generates

    targeted behavioral risk factors and clinical workflow interventions.
    """
    try:
        return ClinicalAiEngine.predict_no_show(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No-show prediction engine failure: {str(exc)}"
        )


@router.post("/generate-soap", response_model=SoapNoteResponse, status_code=status.HTTP_200_OK)
def generate_soap_note(request: SoapNoteRequest):
    """Generates structured medical SOAP (Subjective, Objective, Assessment, Plan)

    consultation records along with differential diagnoses.
    """
    try:
        return ClinicalAiEngine.generate_soap_note(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SOAP note generator failure: {str(exc)}"
        )


@router.get("/queue-insights", response_model=QueueAiInsightsResponse, status_code=status.HTTP_200_OK)
def get_queue_insights(db: Session = Depends(get_db)):
    """Computes real-time dynamic queue analytics, estimated wait times,

    bottleneck detection, and workload balancing recommendations.
    """
    try:
        return ClinicalAiEngine.get_queue_insights(db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Queue insights engine failure: {str(exc)}"
        )
