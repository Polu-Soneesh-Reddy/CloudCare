from datetime import date, datetime, timedelta, timezone
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.notification import Notification
from app.models.patient import Patient
from app.models.queue import QueueEntry
from app.models.settings import ClinicSettings


def seed_database():
    print("Starting CloudCare database seeding...")
    # Ensure all tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed Doctors
        doctors_data = [
            {
                "name": "Dr. Priya Sharma",
                "specialty": "Cardiology",
                "department": "Cardiology",
                "email": "priya.sharma@cloudcare.demo",
                "phone": "+1-555-0101",
                "is_available": True,
                "consultation_duration_minutes": 20,
                "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
                "working_hours_start": "09:00",
                "working_hours_end": "17:00",
                "bio": "Senior cardiologist specializing in cardiovascular interventions and preventive cardiology.",
                "avatar_initials": "PS",
            },
            {
                "name": "Dr. Rahul Mehta",
                "specialty": "Pediatrics",
                "department": "Pediatrics",
                "email": "rahul.mehta@cloudcare.demo",
                "phone": "+1-555-0102",
                "is_available": True,
                "consultation_duration_minutes": 15,
                "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
                "working_hours_start": "08:30",
                "working_hours_end": "16:30",
                "bio": "Experienced pediatrician dedicated to child health, immunizations, and developmental care.",
                "avatar_initials": "RM",
            },
            {
                "name": "Dr. Ananya Iyer",
                "specialty": "Orthopedics",
                "department": "Orthopedics",
                "email": "ananya.iyer@cloudcare.demo",
                "phone": "+1-555-0103",
                "is_available": True,
                "consultation_duration_minutes": 20,
                "working_days": ["Mon", "Wed", "Thu", "Fri", "Sat"],
                "working_hours_start": "09:00",
                "working_hours_end": "17:00",
                "bio": "Orthopedic surgeon specializing in sports injuries, joint preservation, and rehabilitation.",
                "avatar_initials": "AI",
            },
            {
                "name": "Dr. Vikram Patel",
                "specialty": "Dermatology",
                "department": "Dermatology",
                "email": "vikram.patel@cloudcare.demo",
                "phone": "+1-555-0104",
                "is_available": True,
                "consultation_duration_minutes": 15,
                "working_days": ["Tue", "Wed", "Thu", "Fri", "Sat"],
                "working_hours_start": "10:00",
                "working_hours_end": "18:00",
                "bio": "Clinical and aesthetic dermatologist with expertise in acute and chronic skin disorders.",
                "avatar_initials": "VP",
            },
            {
                "name": "Dr. Sneha Reddy",
                "specialty": "Neurology",
                "department": "Neurology",
                "email": "sneha.reddy@cloudcare.demo",
                "phone": "+1-555-0105",
                "is_available": True,
                "consultation_duration_minutes": 30,
                "working_days": ["Mon", "Tue", "Wed", "Thu"],
                "working_hours_start": "09:00",
                "working_hours_end": "16:00",
                "bio": "Consultant neurologist specializing in headache disorders, epilepsy, and neurodegenerative conditions.",
                "avatar_initials": "SR",
            },
            {
                "name": "Dr. Arjun Singh",
                "specialty": "General Medicine",
                "department": "Internal Medicine",
                "email": "arjun.singh@cloudcare.demo",
                "phone": "+1-555-0106",
                "is_available": True,
                "consultation_duration_minutes": 15,
                "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
                "working_hours_start": "08:00",
                "working_hours_end": "16:00",
                "bio": "Primary care physician focusing on holistic wellness, chronic disease management, and triage.",
                "avatar_initials": "AS",
            },
        ]

        doctors_map = {}
        for d_info in doctors_data:
            existing = db.query(Doctor).filter(Doctor.email == d_info["email"]).first()
            if not existing:
                doc = Doctor(**d_info)
                db.add(doc)
                db.flush()
                doctors_map[doc.name] = doc
                print(f"Created doctor: {doc.name}")
            else:
                doctors_map[existing.name] = existing
                print(f"Doctor already exists: {existing.name}")

        db.commit()

        # 2. Seed 15 Synthetic Patients
        patients_data = [
            {"name": "Patient001 Smith", "email": "patient001@cloudcare.demo", "phone": "+1-555-1001", "date_of_birth": date(1985, 4, 12), "gender": "Female", "blood_group": "A+", "allergies": "Penicillin"},
            {"name": "Patient002 Johnson", "email": "patient002@cloudcare.demo", "phone": "+1-555-1002", "date_of_birth": date(1990, 8, 23), "gender": "Male", "blood_group": "O+", "allergies": "None"},
            {"name": "Patient003 Williams", "email": "patient003@cloudcare.demo", "phone": "+1-555-1003", "date_of_birth": date(1978, 1, 15), "gender": "Female", "blood_group": "B+", "allergies": "Sulfa drugs"},
            {"name": "Patient004 Brown", "email": "patient004@cloudcare.demo", "phone": "+1-555-1004", "date_of_birth": date(2001, 11, 30), "gender": "Male", "blood_group": "AB+", "allergies": "Peanuts"},
            {"name": "Patient005 Jones", "email": "patient005@cloudcare.demo", "phone": "+1-555-1005", "date_of_birth": date(1965, 6, 5), "gender": "Male", "blood_group": "O-", "allergies": "Aspirin"},
            {"name": "Patient006 Garcia", "email": "patient006@cloudcare.demo", "phone": "+1-555-1006", "date_of_birth": date(1995, 3, 19), "gender": "Female", "blood_group": "A-", "allergies": "None"},
            {"name": "Patient007 Miller", "email": "patient007@cloudcare.demo", "phone": "+1-555-1007", "date_of_birth": date(1982, 9, 8), "gender": "Male", "blood_group": "B-", "allergies": "Latex"},
            {"name": "Patient008 Davis", "email": "patient008@cloudcare.demo", "phone": "+1-555-1008", "date_of_birth": date(2015, 2, 14), "gender": "Female", "blood_group": "O+", "allergies": "Eggs"},
            {"name": "Patient009 Rodriguez", "email": "patient009@cloudcare.demo", "phone": "+1-555-1009", "date_of_birth": date(1972, 7, 27), "gender": "Male", "blood_group": "A+", "allergies": "Ibuprofen"},
            {"name": "Patient010 Martinez", "email": "patient010@cloudcare.demo", "phone": "+1-555-1010", "date_of_birth": date(1989, 12, 1), "gender": "Female", "blood_group": "O+", "allergies": "None"},
            {"name": "Patient011 Hernandez", "email": "patient011@cloudcare.demo", "phone": "+1-555-1011", "date_of_birth": date(1993, 5, 17), "gender": "Male", "blood_group": "AB-", "allergies": "None"},
            {"name": "Patient012 Lopez", "email": "patient012@cloudcare.demo", "phone": "+1-555-1012", "date_of_birth": date(2018, 10, 9), "gender": "Female", "blood_group": "B+", "allergies": "Dust mites"},
            {"name": "Patient013 Gonzalez", "email": "patient013@cloudcare.demo", "phone": "+1-555-1013", "date_of_birth": date(1960, 4, 4), "gender": "Female", "blood_group": "O-", "allergies": "Codeine"},
            {"name": "Patient014 Wilson", "email": "patient014@cloudcare.demo", "phone": "+1-555-1014", "date_of_birth": date(1987, 8, 16), "gender": "Male", "blood_group": "A+", "allergies": "None"},
            {"name": "Patient015 Anderson", "email": "patient015@cloudcare.demo", "phone": "+1-555-1015", "date_of_birth": date(2003, 3, 21), "gender": "Female", "blood_group": "O+", "allergies": "Shellfish"},
        ]

        patients_list = []
        for p_info in patients_data:
            existing = db.query(Patient).filter(Patient.email == p_info["email"]).first()
            if not existing:
                pat = Patient(
                    name=p_info["name"],
                    email=p_info["email"],
                    phone=p_info["phone"],
                    date_of_birth=p_info["date_of_birth"],
                    gender=p_info["gender"],
                    address="100 Healthcare Way, Suite 100",
                    emergency_contact_name="Emergency Contact",
                    emergency_contact_phone="+1-555-9999",
                    blood_group=p_info["blood_group"],
                    allergies=p_info["allergies"],
                )
                db.add(pat)
                db.flush()
                patients_list.append(pat)
                print(f"Created patient: {pat.name}")
            else:
                patients_list.append(existing)

        db.commit()

        # 3. Seed 20 Appointments (Yesterday, Today, Tomorrow, Future)
        today = date.today()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)
        in_2_days = today + timedelta(days=2)
        in_3_days = today + timedelta(days=3)

        doc_list = list(doctors_map.values())
        appts_specs = [
            # Yesterday (Completed or Cancelled)
            {"p_idx": 0, "d_idx": 0, "date": yesterday, "time": "09:00", "status": "Completed", "reason": "Chest tightness review", "duration": 20},
            {"p_idx": 1, "d_idx": 1, "date": yesterday, "time": "09:30", "status": "Completed", "reason": "Child wellness checkup", "duration": 15},
            {"p_idx": 2, "d_idx": 2, "date": yesterday, "time": "10:00", "status": "Completed", "reason": "Knee pain consultation", "duration": 20},
            {"p_idx": 3, "d_idx": 3, "date": yesterday, "time": "10:30", "status": "Cancelled", "reason": "Skin rash follow-up", "duration": 15},
            {"p_idx": 4, "d_idx": 4, "date": yesterday, "time": "11:00", "status": "Completed", "reason": "Migraine assessment", "duration": 30},

            # Today (In Consultation, Checked In, Confirmed, Scheduled)
            {"p_idx": 5, "d_idx": 0, "date": today, "time": "09:00", "status": "In Consultation", "reason": "Follow-up ECG check", "duration": 20},
            {"p_idx": 6, "d_idx": 0, "date": today, "time": "09:30", "status": "Checked In", "reason": "Hypertension screening", "duration": 20},
            {"p_idx": 7, "d_idx": 1, "date": today, "time": "09:00", "status": "Checked In", "reason": "Seasonal allergy cough", "duration": 15},
            {"p_idx": 8, "d_idx": 2, "date": today, "time": "10:00", "status": "Checked In", "reason": "Shoulder sprain therapy", "duration": 20},
            {"p_idx": 9, "d_idx": 3, "date": today, "time": "10:30", "status": "Checked In", "reason": "Eczema flare-up", "duration": 15},
            {"p_idx": 10, "d_idx": 4, "date": today, "time": "11:00", "status": "Confirmed", "reason": "Persistent dizziness", "duration": 30},
            {"p_idx": 11, "d_idx": 5, "date": today, "time": "11:30", "status": "Scheduled", "reason": "Routine physical exam", "duration": 15},
            {"p_idx": 12, "d_idx": 5, "date": today, "time": "14:00", "status": "Scheduled", "reason": "General blood sugar review", "duration": 15},

            # Tomorrow (Scheduled, Confirmed)
            {"p_idx": 13, "d_idx": 0, "date": tomorrow, "time": "09:00", "status": "Confirmed", "reason": "Lipid panel consultation", "duration": 20},
            {"p_idx": 14, "d_idx": 1, "date": tomorrow, "time": "10:00", "status": "Scheduled", "reason": "Child immunization shot", "duration": 15},
            {"p_idx": 0, "d_idx": 2, "date": tomorrow, "time": "11:00", "status": "Confirmed", "reason": "Post-op wrist evaluation", "duration": 20},
            {"p_idx": 1, "d_idx": 3, "date": tomorrow, "time": "14:00", "status": "Scheduled", "reason": "Mole examination", "duration": 15},

            # Next few days
            {"p_idx": 2, "d_idx": 4, "date": in_2_days, "time": "10:00", "status": "Scheduled", "reason": "Nerve conduction discussion", "duration": 30},
            {"p_idx": 3, "d_idx": 5, "date": in_2_days, "time": "11:00", "status": "Scheduled", "reason": "Thyroid test review", "duration": 15},
            {"p_idx": 4, "d_idx": 0, "date": in_3_days, "time": "09:30", "status": "Scheduled", "reason": "Cardiac rehab update", "duration": 20},
        ]

        created_appts = []
        for a_spec in appts_specs:
            patient_obj = patients_list[a_spec["p_idx"]]
            doctor_obj = doc_list[a_spec["d_idx"]]

            existing_appt = (
                db.query(Appointment)
                .filter(
                    Appointment.doctor_id == doctor_obj.id,
                    Appointment.appointment_date == a_spec["date"],
                    Appointment.appointment_time == a_spec["time"],
                )
                .first()
            )
            if not existing_appt:
                appt = Appointment(
                    patient_id=patient_obj.id,
                    doctor_id=doctor_obj.id,
                    appointment_date=a_spec["date"],
                    appointment_time=a_spec["time"],
                    status=a_spec["status"],
                    reason=a_spec["reason"],
                    notes="Synthetic seed appointment.",
                    duration_minutes=a_spec["duration"],
                )
                db.add(appt)
                db.flush()
                created_appts.append(appt)
            else:
                created_appts.append(existing_appt)

        db.commit()
        print(f"Total appointments seeded/available: {len(created_appts)}")

        # 4. Seed 5 Queue Entries for Today's Appointments
        today_appts = (
            db.query(Appointment)
            .filter(Appointment.appointment_date == today)
            .order_by(Appointment.appointment_time.asc())
            .all()
        )

        now_utc = datetime.now(timezone.utc)
        queue_specs = [
            {"status": "In Consultation", "wait": 0, "called": now_utc - timedelta(minutes=10)},
            {"status": "Waiting", "wait": 20, "called": None},
            {"status": "Waiting", "wait": 15, "called": None},
            {"status": "Waiting", "wait": 20, "called": None},
            {"status": "Waiting", "wait": 15, "called": None},
        ]

        for idx, q_spec in enumerate(queue_specs):
            if idx < len(today_appts):
                target_appt = today_appts[idx]
                existing_q = db.query(QueueEntry).filter(QueueEntry.appointment_id == target_appt.id).first()
                if not existing_q:
                    q_entry = QueueEntry(
                        appointment_id=target_appt.id,
                        queue_number=idx + 1,
                        status=q_spec["status"],
                        estimated_wait_minutes=q_spec["wait"],
                        checked_in_at=now_utc - timedelta(minutes=30 - idx * 5),
                        called_at=q_spec["called"],
                    )
                    db.add(q_entry)
                    print(f"Created queue entry #{idx + 1} for appointment {target_appt.id}")

        db.commit()

        # 5. Seed 8 Notifications
        notifications_data = [
            {"title": "Clinic Schedule Active", "message": "All 6 clinic departments have commenced daily consultations.", "type": "info", "category": "system"},
            {"title": "Queue Alert: High Demand in Cardiology", "message": "Cardiology queue waiting list is currently nearing peak capacity.", "type": "warning", "category": "queue"},
            {"title": "Appointment Checked In", "message": "Patient006 Garcia checked in for Dr. Priya Sharma.", "type": "info", "category": "appointment"},
            {"title": "Consultation Started", "message": "Dr. Priya Sharma called Patient005 Jones into Consultation Room 1.", "type": "success", "category": "queue"},
            {"title": "System Backup Completed", "message": "Automated snapshot backup completed successfully.", "type": "success", "category": "system"},
            {"title": "Follow-Up Reminder", "message": "Patient001 Smith post-op reminder scheduled for tomorrow.", "type": "info", "category": "appointment"},
            {"title": "Inventory Notice: Lab Kits", "message": "Routine re-order triggered for diagnostic test supplies.", "type": "warning", "category": "system"},
            {"title": "Pediatrics Patient Arrived", "message": "Patient008 Davis checked in for Dr. Rahul Mehta.", "type": "info", "category": "queue"},
        ]

        for n_info in notifications_data:
            existing_n = db.query(Notification).filter(Notification.title == n_info["title"]).first()
            if not existing_n:
                notif = Notification(
                    title=n_info["title"],
                    message=n_info["message"],
                    type=n_info["type"],
                    category=n_info["category"],
                    is_read=False,
                )
                db.add(notif)
                print(f"Created notification: {notif.title}")

        db.commit()

        # 6. Seed Default Clinic Settings
        default_settings = {
            "clinic_name": ("CloudCare Medical Center", "Clinic display name"),
            "default_appointment_duration": ("15", "Default appointment length in minutes"),
            "estimated_consultation_duration": ("15", "Consultation time used for queue wait estimation"),
            "max_queue_size": ("50", "Maximum patients allowed in active queue"),
            "working_hours_start": ("09:00", "Daily clinic opening time"),
            "working_hours_end": ("17:00", "Daily clinic closing time"),
            "timezone": ("UTC", "Clinic operating timezone"),
        }

        for key, (val, desc) in default_settings.items():
            existing_s = db.query(ClinicSettings).filter(ClinicSettings.key == key).first()
            if not existing_s:
                s = ClinicSettings(key=key, value=val, description=desc)
                db.add(s)
                print(f"Created setting: {key} = {val}")

        db.commit()
        print("Database seeding completed successfully.")

    except Exception as exc:
        db.rollback()
        print(f"Error seeding database: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
