from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID
from app.models.refresh_token import RefreshToken

class TokenService:
    @staticmethod
    def create_refresh_token_in_db(
        db: Session, 
        user_id: UUID, 
        token: str, 
        expires_at: datetime
    ) -> RefreshToken:
        """Store a newly generated refresh token in the database."""
        # Ensure expires_at is timezone-aware
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        db_token = RefreshToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            is_revoked=False
        )
        db.add(db_token)
        db.commit()
        db.refresh(db_token)
        return db_token

    @staticmethod
    def verify_refresh_token_in_db(db: Session, token: str) -> RefreshToken:
        """Retrieve and validate the refresh token from the database."""
        db_token = db.query(RefreshToken).filter(RefreshToken.token == token).first()
        
        if not db_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is invalid or does not exist",
            )
            
        if db_token.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked",
            )

        now = datetime.now(timezone.utc)
        token_expires = db_token.expires_at
        
        # Ensure timezone comparison is safe
        if token_expires.tzinfo is None:
            token_expires = token_expires.replace(tzinfo=timezone.utc)

        if token_expires < now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired",
            )

        return db_token

    @staticmethod
    def revoke_refresh_token(db: Session, token: str) -> None:
        """Revoke a single refresh token by marking it in the database."""
        db_token = db.query(RefreshToken).filter(RefreshToken.token == token).first()
        if db_token:
            db_token.is_revoked = True
            db.commit()
