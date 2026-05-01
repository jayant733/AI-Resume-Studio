from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    subscription_tier: Mapped[str] = mapped_column(String(50), default="free") # free | pro
    subscription_status: Mapped[str] = mapped_column(String(50), default="active")
    role: Mapped[str] = mapped_column(String(50), default="user")  # user | recruiter
    credits: Mapped[int] = mapped_column(Integer, default=3)
    ai_calls_count: Mapped[int] = mapped_column(Integer, default=0)
    resumes_generated_count: Mapped[int] = mapped_column(Integer, default=0)
    oauth_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    oauth_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    profile_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    resumes = relationship("Resume", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")
    applied_jobs = relationship("AppliedJob", back_populates="user")


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    source_type: Mapped[str] = mapped_column(String(50))
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text)
    parsed_data: Mapped[dict] = mapped_column(JSON)
    profile_image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    image_caption: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="resumes")
    outputs = relationship("GeneratedOutput", back_populates="resume")
    versions = relationship("ResumeVersion", back_populates="resume")


class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    resume_id: Mapped[int] = mapped_column(ForeignKey("resumes.id"))
    version_name: Mapped[str] = mapped_column(String(100))
    data: Mapped[dict] = mapped_column(JSON)
    storage_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    storage_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    resume = relationship("Resume", back_populates="versions")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    parsed_data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class GeneratedOutput(Base):
    __tablename__ = "generated_outputs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    resume_id: Mapped[int] = mapped_column(ForeignKey("resumes.id"))
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"))
    output_json: Mapped[dict] = mapped_column(JSON)
    original_resume_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    evaluation_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    explainability_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    storage_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    storage_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    resume = relationship("Resume", back_populates="outputs")


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    resume_id: Mapped[int] = mapped_column(ForeignKey("resumes.id"))
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"))
    status: Mapped[str] = mapped_column(String(20), default="queued")
    output_id: Mapped[Optional[int]] = mapped_column(ForeignKey("generated_outputs.id"), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    resume_id: Mapped[Optional[int]] = mapped_column(ForeignKey("resumes.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(50))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chat_messages")


class AppliedJob(Base):
    __tablename__ = "applied_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    output_id: Mapped[Optional[int]] = mapped_column(ForeignKey("generated_outputs.id"), nullable=True)
    job_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    job_title: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="applied")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="applied_jobs")
    output = relationship("GeneratedOutput")
    job = relationship("Job", secondary="generated_outputs", viewonly=True, uselist=False)
