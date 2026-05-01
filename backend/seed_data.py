import json
import sys
import os
from datetime import datetime, timedelta

# Add the backend directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.db.tables import User, AppliedJob, Resume, Job, GeneratedOutput

def seed_data():
    db = SessionLocal()
    try:
        # Get first user
        user = db.query(User).first()
        if not user:
            print("No user found. Please sign up in the app first.")
            return

        print(f"Seeding data for user: {user.email}")

        # Ensure user has a resume
        resume = db.query(Resume).filter(Resume.user_id == user.id).first()
        if not resume:
            resume = Resume(
                user_id=user.id,
                source_type="manual",
                raw_text="Sample resume text",
                parsed_data={"name": user.full_name or "Sample User", "skills": ["Python", "React"]}
            )
            db.add(resume)
            db.flush()

        # Sample applications data
        apps_info = [
            { "company": "Google", "role": "Backend Intern", "status": "applied", "ats": 82 },
            { "company": "Amazon", "role": "SDE Intern", "status": "interview", "ats": 91 },
            { "company": "Meta", "role": "Frontend Intern", "status": "rejected", "ats": 65 },
            { "company": "Microsoft", "role": "Software Engineer", "status": "applied", "ats": 78 },
            { "company": "Netflix", "role": "Fullstack Developer", "status": "offer", "ats": 88 },
        ]

        # Clear existing applications for this user to avoid duplicates if re-run
        db.query(AppliedJob).filter(AppliedJob.user_id == user.id).delete()

        for info in apps_info:
            # Create a dummy job
            job = Job(
                title=info["role"],
                company=info["company"],
                description=f"Description for {info['role']} at {info['company']}",
                parsed_data={}
            )
            db.add(job)
            db.flush()

            # Create a dummy output with evaluation data for the ATS score
            output = GeneratedOutput(
                resume_id=resume.id,
                job_id=job.id,
                output_json={},
                evaluation_data={
                    "overall_score": {
                        "after": info["ats"],
                        "before": info["ats"] - 10,
                        "improvement": 10
                    }
                }
            )
            db.add(output)
            db.flush()

            # Create the applied job record
            app = AppliedJob(
                user_id=user.id,
                company=info["company"],
                job_title=info["role"],
                status=info["status"],
                output_id=output.id,
                created_at=datetime.now() - timedelta(days=info["ats"] % 10)
            )
            db.add(app)
        
        db.commit()
        print("Successfully seeded 5 applications with ATS scores.")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
