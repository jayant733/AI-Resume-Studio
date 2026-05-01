from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.tables import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def add_user():
    db = SessionLocal()
    try:
        email = "user10@gmail.com"
        # Using the LITERAL string provided by the user as the password
        password = r"JayaNT @AppData\Local\BraveSoftware\Brave-Browser\User Data\Default\Code Cache\js\8e6a75ebe2129058_0"
        
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"User {email} already exists. Updating password and status.")
            user.password_hash = pwd_context.hash(password)
            user.subscription_tier = "pro"
            user.credits = 9999
        else:
            print(f"Creating premium user {email}.")
            new_user = User(
                email=email,
                password_hash=pwd_context.hash(password),
                subscription_tier="pro",
                credits=9999,
                full_name="Premium User 10"
            )
            db.add(new_user)
        
        db.commit()
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_user()
