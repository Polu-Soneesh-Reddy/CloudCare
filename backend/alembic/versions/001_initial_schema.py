"""Initial schema migration for CloudCare.

Revision ID: 001
Revises: 
Create Date: 2026-10-23 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Doctors table
    op.create_table(
        'doctors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('specialty', sa.String(length=100), nullable=False),
        sa.Column('department', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=200), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('is_available', sa.Boolean(), nullable=True, default=True),
        sa.Column('consultation_duration_minutes', sa.Integer(), nullable=True, default=15),
        sa.Column('working_days', sa.JSON(), nullable=True),
        sa.Column('working_hours_start', sa.String(length=5), nullable=True, default='09:00'),
        sa.Column('working_hours_end', sa.String(length=5), nullable=True, default='17:00'),
        sa.Column('bio', sa.String(length=500), nullable=True),
        sa.Column('avatar_initials', sa.String(length=5), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_doctors_id'), 'doctors', ['id'], unique=False)

    # 2. Patients table
    op.create_table(
        'patients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('email', sa.String(length=200), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(length=20), nullable=True),
        sa.Column('address', sa.String(length=300), nullable=True),
        sa.Column('emergency_contact_name', sa.String(length=150), nullable=True),
        sa.Column('emergency_contact_phone', sa.String(length=20), nullable=True),
        sa.Column('blood_group', sa.String(length=10), nullable=True),
        sa.Column('allergies', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_patients_id'), 'patients', ['id'], unique=False)

    # 3. Appointments table
    op.create_table(
        'appointments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('doctor_id', sa.Integer(), nullable=False),
        sa.Column('appointment_date', sa.Date(), nullable=False),
        sa.Column('appointment_time', sa.String(length=5), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='Scheduled'),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True, default=15),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id']),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('doctor_id', 'appointment_date', 'appointment_time', 'status', name='uq_doctor_datetime_active'),
    )
    op.create_index(op.f('ix_appointments_id'), 'appointments', ['id'], unique=False)
    op.create_index(op.f('ix_appointments_appointment_date'), 'appointments', ['appointment_date'], unique=False)

    # 4. Queue entries table
    op.create_table(
        'queue_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=False),
        sa.Column('queue_number', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=True, server_default='Waiting'),
        sa.Column('estimated_wait_minutes', sa.Integer(), nullable=True, default=0),
        sa.Column('checked_in_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('called_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_queue_entries_id'), 'queue_entries', ['id'], unique=False)

    # 5. Notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=True, server_default='info'),
        sa.Column('category', sa.String(length=50), nullable=True, server_default='general'),
        sa.Column('is_read', sa.Boolean(), nullable=True, default=False),
        sa.Column('related_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)

    # 6. Clinic settings table
    op.create_table(
        'clinic_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.String(length=500), nullable=False),
        sa.Column('description', sa.String(length=300), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key'),
    )
    op.create_index(op.f('ix_clinic_settings_id'), 'clinic_settings', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_clinic_settings_id'), table_name='clinic_settings')
    op.drop_table('clinic_settings')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')
    op.drop_index(op.f('ix_queue_entries_id'), table_name='queue_entries')
    op.drop_table('queue_entries')
    op.drop_index(op.f('ix_appointments_appointment_date'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_id'), table_name='appointments')
    op.drop_table('appointments')
    op.drop_index(op.f('ix_patients_id'), table_name='patients')
    op.drop_table('patients')
    op.drop_index(op.f('ix_doctors_id'), table_name='doctors')
    op.drop_table('doctors')
