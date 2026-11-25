from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
import smtplib
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger("app.email_service")


class EmailService:
    @staticmethod
    def _build_otp_html(intro_text: str, otp_code: str, ignore_text: str) -> str:
        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #ffffff;
      color: #111827;
      margin: 0;
      padding: 40px 20px;
      -webkit-font-smoothing: antialiased;
    }}
    .container {{
      max-width: 500px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 24px;
      color: #111827;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 16px;
    }}
    .code-container {{
      background-color: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px 16px;
      text-align: center;
      margin: 24px 0;
    }}
    .otp-code {{
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #008b5c;
      margin-top: 4px;
    }}
    .footer {{
      font-size: 12px;
      color: #64748b;
      margin-top: 32px;
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Enterprise LMS</div>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello,</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">{intro_text}</p>
    <div class="code-container">
      <div style="font-size: 11px; text-transform: uppercase; color: #4b5563; font-weight: 800; letter-spacing: 0.08em;">Verification Code</div>
      <div class="otp-code">{otp_code}</div>
    </div>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">{ignore_text}</p>
    <div class="footer">
      Regards,<br>
      <strong style="color: #475569;">Enterprise LMS Security Team</strong>
    </div>
  </div>
</body>
</html>
"""

    @staticmethod
    def _send_email(to_email: str, subject: str, text_body: str, html_body: str, otp_code: str, dev_label: str) -> None:
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            if settings.is_production:
                logger.error("SMTP credentials are missing in production; cannot send email.")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Email delivery service is not configured.",
                )
            logger.warning(f"[DEVELOPMENT MODE] SMTP not configured. {dev_label} for {to_email} is: {otp_code}")
            return

        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            logger.info(f"Connecting to SMTP server {settings.SMTP_HOST}:{settings.SMTP_PORT}")
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
            logger.info(f"Email sent successfully to {to_email}")
        except Exception as exc:
            logger.error(f"Failed to send email to {to_email}: {exc}")
            if settings.is_production:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Failed to dispatch verification email. Please try again later.",
                )
            logger.warning(f"[DEVELOPMENT FALLBACK] {dev_label} for {to_email} is: {otp_code}")

    @staticmethod
    def send_otp_email(to_email: str, otp_code: str) -> None:
        """Send a 6-digit password reset OTP to the registered user email."""
        subject = "Enterprise LMS - Password Reset OTP"
        text_body = (
            "Hello,\n\n"
            "You have requested a password reset for your Enterprise LMS account.\n"
            f"Your 6-digit verification code is: {otp_code}\n\n"
            "This code is valid for 10 minutes. If you did not request this reset, you can safely ignore this email.\n\n"
            "Regards,\nEnterprise LMS Security Team\n"
        )
        html_body = EmailService._build_otp_html(
            intro_text="You have requested a password reset for your Enterprise LMS account.",
            otp_code=otp_code,
            ignore_text="This code is valid for 10 minutes. If you did not request this reset, you can safely ignore this email.",
        )
        EmailService._send_email(to_email, subject, text_body, html_body, otp_code, "Reset OTP")

    @staticmethod
    def send_verification_otp_email(to_email: str, otp_code: str) -> None:
        """Send a 6-digit OTP for email verification when adding a new user."""
        subject = "Enterprise LMS - Email Verification OTP"
        text_body = (
            "Hello,\n\n"
            "A new user registration has been requested for this email address.\n"
            f"Your 6-digit email verification code is: {otp_code}\n\n"
            "This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.\n\n"
            "Regards,\nEnterprise LMS Security Team\n"
        )
        html_body = EmailService._build_otp_html(
            intro_text="A new user registration has been requested for this email address.",
            otp_code=otp_code,
            ignore_text="This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.",
        )
        EmailService._send_email(to_email, subject, text_body, html_body, otp_code, "Email Verification OTP")
