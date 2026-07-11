from sqlalchemy.orm import Session
from backend.app.module_b_admin.domain.models import SystemConfig

class SystemConfigService:
    """
    Facade/Service to handle cross-domain access to SystemConfig safely.
    Follows DDD principles to avoid direct querying of Admin's table by other modules.
    """
    @classmethod
    def get_config_value(cls, db: Session, key: str, default_value=None):
        config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        if config and config.value is not None:
            return config.value
        return default_value

    @classmethod
    def get_student_safelink_url(cls, db: Session) -> str:
        return cls.get_config_value(db, "student_safelink_url", default_value=None)
