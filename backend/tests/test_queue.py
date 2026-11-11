from datetime import date
import uuid
import pytest
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient


def create_doctor(db, duration=15):
    doc = Doctor(
        name="Dr. Queue Specialist",
        specialty="Pediatrics",
        department="Pediatrics",
        email=f"qdoc_{uuid.uuid4().hex[:8]}@cloudcare.demo",
        phone="+1-555-0399",
        is_available=True,
        consultation_duration_minutes=duration,
        working_days=["Mon", "Tue", "Wed", "Thu", "Fri"],
        working_hours_start="09:00",
        working_hours_end="17:00",
        avatar_initials="QS",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def create_patient(db):
    pat = Patient(
        name="Queue Patient",
        email=f"qpat_{uuid.uuid4().hex[:8]}@cloudcare.demo",
        phone="+1-555-0499",
        date_of_birth=date(1995, 2, 20),
        gender="Female",
    )
    db.add(pat)
    db.commit()
    db.refresh(pat)
    return pat


def create_today_appointment(db, doctor_id, patient_id, time_str="09:00"):
    appt = Appointment(
        patient_id=patient_id,
        doctor_id=doctor_id,
        appointment_date=date.today(),
        appointment_time=time_str,
        status="Scheduled",
        reason="Consultation",
        duration_minutes=15,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


def test_add_to_queue(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    appt = create_today_appointment(db, doc.id, pat.id, "09:00")

    response = client.post(
        "/api/v1/queue/",
        json={"appointment_id": appt.id},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["appointment_id"] == appt.id
    assert data["queue_number"] >= 1
    assert data["status"] == "Waiting"
    assert data["patient_name"] == pat.name
    assert data["doctor_name"] == doc.name


def test_update_queue_status(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    appt = create_today_appointment(db, doc.id, pat.id, "09:15")

    add_res = client.post(
        "/api/v1/queue/",
        json={"appointment_id": appt.id},
        headers=auth_headers,
    )
    q_id = add_res.json()["id"]

    # Transition Waiting -> In Consultation
    update_res = client.put(
        f"/api/v1/queue/{q_id}/status",
        json={"status": "In Consultation"},
        headers=auth_headers,
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["status"] == "In Consultation"
    assert data["called_at"] is not None


def test_wait_time_calculation(client, auth_headers, db):
    doc = create_doctor(db, duration=20)
    pat1 = create_patient(db)
    pat2 = create_patient(db)

    appt1 = create_today_appointment(db, doc.id, pat1.id, "09:30")
    appt2 = create_today_appointment(db, doc.id, pat2.id, "10:00")

    # Add 1st entry: 0 wait ahead
    res1 = client.post(
        "/api/v1/queue/",
        json={"appointment_id": appt1.id},
        headers=auth_headers,
    )
    assert res1.status_code == 201
    assert res1.json()["estimated_wait_minutes"] == 0

    # Add 2nd entry: 1 waiting entry ahead * 20 min = 20 min
    res2 = client.post(
        "/api/v1/queue/",
        json={"appointment_id": appt2.id},
        headers=auth_headers,
    )
    assert res2.status_code == 201
    data2 = res2.json()
    assert isinstance(data2["estimated_wait_minutes"], int)
    assert data2["estimated_wait_minutes"] >= 20


def test_get_queue_list(client, auth_headers, db):
    doc = create_doctor(db)
    pat = create_patient(db)
    appt = create_today_appointment(db, doc.id, pat.id, "10:30")

    client.post(
        "/api/v1/queue/",
        json={"appointment_id": appt.id},
        headers=auth_headers,
    )

    response = client.get("/api/v1/queue/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
