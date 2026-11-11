from datetime import date, timedelta
import uuid
import pytest
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient


def create_doctor(db):
    doc = Doctor(
        name="Dr. Test Surgeon",
        specialty="General Surgery",
        department="Surgery",
        email=f"doc_{uuid.uuid4().hex[:8]}@cloudcare.demo",
        phone="+1-555-0199",
        is_available=True,
        consultation_duration_minutes=20,
        working_days=["Mon", "Tue", "Wed", "Thu", "Fri"],
        working_hours_start="09:00",
        working_hours_end="17:00",
        avatar_initials="TS",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def create_patient(db):
    pat = Patient(
        name="Test Patient",
        email=f"pat_{uuid.uuid4().hex[:8]}@cloudcare.demo",
        phone="+1-555-0299",
        date_of_birth=date(1990, 5, 15),
        gender="Male",
    )
    db.add(pat)
    db.commit()
    db.refresh(pat)
    return pat


def test_create_appointment_success(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    target_date = (date.today() + timedelta(days=2)).isoformat()

    payload = {
        "patient_id": pat.id,
        "doctor_id": doc.id,
        "appointment_date": target_date,
        "appointment_time": "10:00",
        "status": "Scheduled",
        "reason": "Regular checkup",
        "duration_minutes": 20,
    }

    response = client.post("/api/v1/appointments/", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["patient_id"] == pat.id
    assert data["doctor_id"] == doc.id
    assert data["appointment_date"] == target_date
    assert data["appointment_time"] == "10:00"
    assert data["status"] == "Scheduled"
    assert data["doctor_name"] == doc.name
    assert data["patient_name"] == pat.name


def test_create_appointment_missing_patient_id(client, auth_headers, db):
    doc = create_doctor(db)
    target_date = (date.today() + timedelta(days=2)).isoformat()

    payload = {
        "doctor_id": doc.id,
        "appointment_date": target_date,
        "appointment_time": "10:00",
    }
    response = client.post("/api/v1/appointments/", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_create_appointment_past_date(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    past_date = (date.today() - timedelta(days=2)).isoformat()

    payload = {
        "patient_id": pat.id,
        "doctor_id": doc.id,
        "appointment_date": past_date,
        "appointment_time": "10:00",
        "status": "Scheduled",
    }
    response = client.post("/api/v1/appointments/", json=payload, headers=auth_headers)
    assert response.status_code == 400


def test_create_duplicate_active_appointment(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    target_date = (date.today() + timedelta(days=2)).isoformat()

    payload = {
        "patient_id": pat.id,
        "doctor_id": doc.id,
        "appointment_date": target_date,
        "appointment_time": "11:00",
        "status": "Scheduled",
    }
    res1 = client.post("/api/v1/appointments/", json=payload, headers=auth_headers)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/appointments/", json=payload, headers=auth_headers)
    assert res2.status_code == 409


def test_get_appointment_list(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    target_date = (date.today() + timedelta(days=1)).isoformat()

    payload = {
        "patient_id": pat.id,
        "doctor_id": doc.id,
        "appointment_date": target_date,
        "appointment_time": "14:00",
        "status": "Scheduled",
    }
    client.post("/api/v1/appointments/", json=payload, headers=auth_headers)

    response = client.get("/api/v1/appointments/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    items = data["items"] if isinstance(data, dict) and "items" in data else data
    assert isinstance(items, list)
    assert len(items) >= 1


def test_get_single_appointment(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    target_date = (date.today() + timedelta(days=1)).isoformat()

    payload = {
        "patient_id": pat.id,
        "doctor_id": doc.id,
        "appointment_date": target_date,
        "appointment_time": "15:00",
        "status": "Scheduled",
    }
    res = client.post("/api/v1/appointments/", json=payload, headers=auth_headers)
    appt_id = res.json()["id"]

    get_res = client.get(f"/api/v1/appointments/{appt_id}", headers=auth_headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == appt_id
    assert data["patient_name"] == pat.name
    assert data["doctor_name"] == doc.name


def test_get_non_existent_appointment(client, auth_headers):
    response = client.get("/api/v1/appointments/999999", headers=auth_headers)
    assert response.status_code == 404


def test_update_appointment_status_valid(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    target_date = (date.today() + timedelta(days=1)).isoformat()

    payload = {
        "patient_id": pat.id,
        "doctor_id": doc.id,
        "appointment_date": target_date,
        "appointment_time": "16:00",
        "status": "Scheduled",
    }
    create_res = client.post("/api/v1/appointments/", json=payload, headers=auth_headers)
    appt_id = create_res.json()["id"]

    # Transition from Scheduled -> Confirmed is valid
    update_res = client.put(f"/api/v1/appointments/{appt_id}", json={"status": "Confirmed"}, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "Confirmed"


def test_update_appointment_status_invalid(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    target_date = (date.today() + timedelta(days=1)).isoformat()

    payload = {
        "patient_id": pat.id,
        "doctor_id": doc.id,
        "appointment_date": target_date,
        "appointment_time": "16:30",
        "status": "Scheduled",
    }
    create_res = client.post("/api/v1/appointments/", json=payload, headers=auth_headers)
    appt_id = create_res.json()["id"]

    # Transition from Scheduled -> Completed directly is invalid
    update_res = client.put(f"/api/v1/appointments/{appt_id}", json={"status": "Completed"}, headers=auth_headers)
    assert update_res.status_code == 400


def test_cancel_appointment(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    target_date = (date.today() + timedelta(days=1)).isoformat()

    payload = {
        "patient_id": pat.id,
        "doctor_id": doc.id,
        "appointment_date": target_date,
        "appointment_time": "17:00",
        "status": "Scheduled",
    }
    create_res = client.post("/api/v1/appointments/", json=payload, headers=auth_headers)
    appt_id = create_res.json()["id"]

    cancel_res = client.delete(f"/api/v1/appointments/{appt_id}", headers=auth_headers)
    assert cancel_res.status_code == 200

    # Verify status changed to Cancelled
    get_res = client.get(f"/api/v1/appointments/{appt_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "Cancelled"
