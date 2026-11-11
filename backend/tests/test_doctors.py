import uuid
import pytest
from app.models.doctor import Doctor


def create_doctor(db, email=None):
    doc = Doctor(
        name="Dr. Test Physician",
        specialty="Internal Medicine",
        department="Medicine",
        email=email or f"doc_{uuid.uuid4().hex[:8]}@cloudcare.demo",
        phone="+1-555-0599",
        is_available=True,
        consultation_duration_minutes=15,
        working_days=["Mon", "Tue", "Wed", "Thu", "Fri"],
        working_hours_start="09:00",
        working_hours_end="17:00",
        avatar_initials="TP",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def test_list_doctors(client, auth_headers, db):
    create_doctor(db)
    response = client.get("/api/v1/doctors/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_create_doctor(client, auth_headers, db):
    payload = {
        "name": "Dr. Clara Oswald",
        "specialty": "Neurology",
        "department": "Neurology",
        "email": f"clara_{uuid.uuid4().hex[:8]}@cloudcare.demo",
        "phone": "+1-555-0600",
        "is_available": True,
        "consultation_duration_minutes": 30,
        "working_days": ["Mon", "Tue", "Wed"],
        "working_hours_start": "09:00",
        "working_hours_end": "15:00",
        "bio": "Neurology specialist.",
    }
    response = client.post("/api/v1/doctors/", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["email"] == payload["email"]
    assert data["specialty"] == payload["specialty"]
    assert data["avatar_initials"] == "CO"


def test_get_doctor_by_id(client, auth_headers, db):
    doc = create_doctor(db)
    response = client.get(f"/api/v1/doctors/{doc.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == doc.id
    assert data["name"] == doc.name
    assert "today_appointments" in data


def test_get_non_existent_doctor(client, auth_headers):
    response = client.get("/api/v1/doctors/999999", headers=auth_headers)
    assert response.status_code == 404


def test_update_doctor_availability(client, auth_headers, db):
    doc = create_doctor(db)
    assert doc.is_available is True

    update_payload = {"is_available": False}
    response = client.put(f"/api/v1/doctors/{doc.id}", json=update_payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_available"] is False
