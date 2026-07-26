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
        
        # Plain text fallback
        text_body = f"""Hello,

You have requested a password reset for your Enterprise LMS account.
Your 6-digit verification code is: {otp_code}

This code is valid for 10 minutes. If you did not request this reset, you can safely ignore this email.

Regards,
Enterprise LMS Security Team
"""

        # Elegant HTML email matching Glassdoor's Brand Guidelines (White, Black, Gray, Accent Green)
        html_body = f"""<!DOCTYPE html>
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
      color: #008b5c; /* Accessible Brand Accent Green */
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
    <div class="header">
      Enterprise LMS
    </div>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello,</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">You have requested a password reset for your Enterprise LMS account.</p>
    <div class="code-container">
      <div style="font-size: 11px; text-transform: uppercase; color: #4b5563; font-weight: 800; letter-spacing: 0.08em;">Verification Code</div>
      <div class="otp-code">{otp_code}</div>
    </div>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">This code is valid for 10 minutes. If you did not request this reset, you can safely ignore this email.</p>
    <div class="footer">
      Regards,<br>
      <strong style="color: #475569;">Enterprise LMS Security Team</strong>
    </div>
  </div>
</body>
</html>
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
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to_email
            msg["Subject"] = subject
            
            # Attach both parts
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

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

    @staticmethod
    def send_verification_otp_email(to_email: str, otp_code: str) -> None:
        """Send a 6-digit OTP for email verification when adding a new user."""
        subject = "Enterprise LMS - Email Verification OTP"
        text_body = f"""Hello,
 
A new user registration has been requested for this email address.
Your 6-digit email verification code is: {otp_code}
 
This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.
 
Regards,
Enterprise LMS Security Team
"""
        html_body = f"""<!DOCTYPE html>
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
    <div class="header">
      Enterprise LMS
    </div>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello,</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">A new user registration has been requested for this email address.</p>
    <div class="code-container">
      <div style="font-size: 11px; text-transform: uppercase; color: #4b5563; font-weight: 800; letter-spacing: 0.08em;">Verification Code</div>
      <div class="otp-code">{otp_code}</div>
    </div>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
    <div class="footer">
      Regards,<br>
      <strong style="color: #475569;">Enterprise LMS Security Team</strong>
    </div>
  </div>
</body>
</html>
"""
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning(
                f"[DEVELOPMENT MODE] SMTP not fully configured. Email verification OTP for {to_email} is: {otp_code}"
            )
            print(
                f"\n========================================\n"
                f"[EMAIL SERVICE SIMULATION - USER CREATION]\n"
                f"To: {to_email}\n"
                f"Subject: {subject}\n"
                f"OTP Code: {otp_code}\n"
                f"========================================\n"
            )
            return

        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            logger.info(f"Connecting to SMTP server {settings.SMTP_HOST}:{settings.SMTP_PORT} for verification")
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
            server.quit()
            logger.info(f"Email verification OTP sent successfully to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send verification OTP email to {to_email}: {str(e)}")
            print(
                f"\n========================================\n"
                f"[EMAIL SERVICE FALLBACK - SMTP ERROR]\n"
                f"Failed to send verification email to {to_email} due to: {str(e)}\n"
                f"OTP Code: {otp_code}\n"
                f"========================================\n"
            )
