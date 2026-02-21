"""
Simple email sending for password reset and similar. Uses SMTP from settings.
If SMTP is not configured, logs the reset link for development.
"""
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_token: str, portal: str = "customer") -> bool:
    """
    Send password reset email. Uses CUSTOMER_RESET_PASSWORD_BASE_URL for customer portal.
    portal: "customer" | "vendor" | "chef" | "driver" (for future use)
    Returns True if sent (or logged in dev), False on send failure.
    """
    base_url = (settings.CUSTOMER_RESET_PASSWORD_BASE_URL or "").strip() or "https://eazyfoods.ca"
    reset_link = f"{base_url.rstrip('/')}/login?token={reset_token}"
    subject = "Reset your eazyfoods password"
    body_plain = (
        f"You requested a password reset for your eazyfoods account.\n\n"
        f"Click the link below to set a new password (link expires in 1 hour):\n{reset_link}\n\n"
        f"If you didn't request this, you can ignore this email.\n\n"
        f"— eazyfoods"
    )
    body_html = (
        f"<p>You requested a password reset for your eazyfoods account.</p>"
        f"<p><a href=\"{reset_link}\">Reset your password</a> (link expires in 1 hour).</p>"
        f"<p>If you didn't request this, you can ignore this email.</p>"
        f"<p>— eazyfoods</p>"
    )

    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        logger.warning(
            "SMTP not configured. Password reset link (log only): %s",
            reset_link,
        )
        return True

    try:
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        msg["To"] = to_email
        msg.attach(MIMEText(body_plain, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], to_email, msg.as_string())
        logger.info("Password reset email sent to %s", to_email)
        return True
    except Exception as e:
        logger.exception("Failed to send password reset email: %s", e)
        return False
