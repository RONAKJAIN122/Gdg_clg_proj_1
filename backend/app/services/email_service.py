"""
Email service using aiosmtplib (async SMTP).
In dev: prints OTP to console + tries Ethereal if configured.
"""
import logging

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


async def _send_email(to: str, subject: str, html_body: str) -> None:
    """Send an email. Falls back to console logging on failure (dev mode)."""
    msg = MIMEMultipart("alternative")
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    if not settings.SMTP_USER:
        logger.info(f"[DEV EMAIL] To={to} | Subject={subject}")
        logger.info(f"[DEV EMAIL BODY]\n{html_body}")
        return

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            start_tls=True,
        )
        logger.info(f"Email sent to {to}: {subject}")
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        # Don't crash the request — just log
        logger.info(f"[FALLBACK] OTP/reminder would have been sent to {to}")


async def send_otp_email(to: str, name: str, otp: str) -> None:
    subject = "CampusDesk — Your Login OTP"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a56db;">CampusDesk</h2>
      <p>Hi <strong>{name}</strong>,</p>
      <p>Your one-time login code is:</p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a56db;">{otp}</span>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        This code expires in <strong>5 minutes</strong> and can only be used once.
        If you didn't request this, ignore this email.
      </p>
    </div>
    """
    # Always print to console in dev
    print(f"\n{'='*40}\n[OTP] {to} → {otp}\n{'='*40}\n")
    await _send_email(to, subject, html)


async def send_reminder_email(to: str, name: str, resource_name: str, start_time: str) -> None:
    subject = f"CampusDesk — Reminder: {resource_name} booking in 1 hour"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a56db;">CampusDesk</h2>
      <p>Hi <strong>{name}</strong>,</p>
      <p>This is a reminder that your booking starts in <strong>1 hour</strong>:</p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0; font-weight: 600; font-size: 18px;">{resource_name}</p>
        <p style="margin: 8px 0 0; color: #64748b;">{start_time}</p>
      </div>
      <p style="color: #64748b; font-size: 14px;">See you there!</p>
    </div>
    """
    await _send_email(to, subject, html)


async def send_waitlist_promotion_email(to: str, name: str, resource_name: str, start_time: str) -> None:
    subject = f"CampusDesk — Slot Available: {resource_name}"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a56db;">CampusDesk</h2>
      <p>Hi <strong>{name}</strong>,</p>
      <p>Great news! A slot you were waitlisted for is now available:</p>
      <div style="background: #dcfce7; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0; font-weight: 600; font-size: 18px;">{resource_name}</p>
        <p style="margin: 8px 0 0; color: #166534;">{start_time}</p>
      </div>
      <p>Log in to CampusDesk to confirm your booking.</p>
    </div>
    """
    await _send_email(to, subject, html)
