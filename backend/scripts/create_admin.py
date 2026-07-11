import sys
import os

# Add the parent directory to sys.path so we can import backend.app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from sqlalchemy.orm import Session
from backend.app.shared.infrastructure.database import SessionLocal, Base, engine
from backend.app.shared.domain.models import User, UserRole
from backend.app.shared.infrastructure.auth import AuthHandler

def create_admin(email: str, password: str, full_name: str = "Administrator"):
    db: Session = SessionLocal()
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"Error: Email {email} sudah terdaftar.")
            return

        hashed_pw = AuthHandler.get_password_hash(password)
        
        admin_user = User(
            email=email,
            password_hash=hashed_pw,
            role=UserRole.ADMIN,
            full_name=full_name,
            is_verified=True # Admin otomatis terverifikasi
        )
        
        db.add(admin_user)
        db.commit()
        print(f"Sukses! Akun admin untuk {email} berhasil dibuat.")
        print(f"Silakan gunakan email '{email}' dan password yang Anda berikan untuk login ke panel admin.")
        
    except Exception as e:
        db.rollback()
        print(f"Terjadi kesalahan saat membuat akun admin: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Penggunaan: python create_admin.py <email> <password> [full_name]")
        sys.exit(1)
        
    email = sys.argv[1]
    password = sys.argv[2]
    full_name = sys.argv[3] if len(sys.argv) > 3 else "Administrator"
    
    # Initialize DB (creates tables if they don't exist)
    Base.metadata.create_all(bind=engine)
    
    print("Mempersiapkan pembuatan akun Admin...")
    create_admin(email, password, full_name)
