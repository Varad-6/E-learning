import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.core.config import settings

logger = logging.getLogger("app.email_service")

class EmailService:
    @staticmethod
    def send_otp_email(to_email: str, otp_code: str) -> None:
        """Send a 6-digit OTP to the registered user email."""
        subject = "Enterprise LMS - Password Reset OTP"
        body = f"""Hello,

You have requested a password reset for your Enterprise LMS account.
Your 6-digit OTP code is: {otp_code}

This OTP is valid for 10 minutes.

If you did not request this reset, please ignore this email.

Regards,
Enterprise LMS Security Team
"""

        # Check if SMTP user is configured; if not, simulate sending
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning(
                f"[DEVELOPMENT MODE] SMTP not fully configured. Reset OTP for {to_email} is: {otp_code}"
            )
            print(
                f"\n========================================\n"
                f"[EMAIL SERVICE SIMULATION]\n"
                f"To: {to_email}\n"
                f"Subject: {subject}\n"
                f"OTP Code: {otp_code}\n"
                f"========================================\n"
            )
            return

        try:
            msg = MIMEMultipart()
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            logger.info(f"Connecting to SMTP server {settings.SMTP_HOST}:{settings.SMTP_PORT}")
            # Connect to SMTP server
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_TLS:
                server.starttls()
            
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
            server.quit()
            logger.info(f"OTP email sent successfully to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send OTP email to {to_email}: {str(e)}")
            # Print to stdout as a fallback so that local runs are never stuck
            print(
                f"\n========================================\n"
                f"[EMAIL SERVICE FALLBACK - SMTP ERROR]\n"
                f"Failed to send email to {to_email} due to: {str(e)}\n"
                f"OTP Code: {otp_code}\n"
                f"========================================\n"
            )
