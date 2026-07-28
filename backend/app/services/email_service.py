"""
Email service — sends real emails.
Strategy:
  - If RESEND_API_KEY is set → use Resend HTTP API (works on Render, port 443)
  - Otherwise → use Gmail SMTP (works locally)
"""
import asyncio
import logging
import smtplib
import traceback
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import partial

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Diagnostic: print email config on startup
_smtp_info = f"SMTP_HOST={settings.SMTP_HOST} SMTP_USER={settings.SMTP_USER}"
_resend_info = f"RESEND_API_KEY={'***' + settings.RESEND_API_KEY[-6:] if settings.RESEND_API_KEY else 'NOT SET'}"
print(f"[EMAIL CONFIG] {_smtp_info} | {_resend_info} | EMAIL_FROM={settings.EMAIL_FROM}")


def _build_message(to: str, subject: str, html_body: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))
    return msg


async def _send_via_brevo(to: str, subject: str, html_body: str) -> None:
    """Send email via Brevo REST API (works on any cloud host over HTTPS)."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": settings.BREVO_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "sender": {"name": "CampusDesk", "email": settings.SMTP_USER or settings.EMAIL_FROM or "lnmiiitopt@gmail.com"},
                "to": [{"email": to}],
                "subject": subject,
                "htmlContent": html_body,
            },
        )
        if resp.status_code in (200, 201):
            print(f"[EMAIL SENT via Brevo HTTP API] to {to}")
        else:
            print(f"[EMAIL ERROR] Brevo API returned {resp.status_code}: {resp.text}")
            resp.raise_for_status()


def _send_via_smtp_sync(msg: MIMEMultipart, to: str) -> None:
    """Synchronous email send via smtplib — runs in a thread pool.
    Tries port 465 (SSL) first, then port 587 (STARTTLS)."""

    # Strategy 1: Port 465 with implicit SSL
    try:
        print(f"[EMAIL] Trying SSL port 465...")
        with smtplib.SMTP_SSL(settings.SMTP_HOST, 465, timeout=8) as server:
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.send_message(msg)
        print(f"[EMAIL SENT via SSL:465] to {to}")
        return
    except Exception as e:
        print(f"[EMAIL] SSL:465 failed: {type(e).__name__}: {e}")

    # Strategy 2: Port 587 with STARTTLS
    try:
        print(f"[EMAIL] Trying STARTTLS port 587...")
        with smtplib.SMTP(settings.SMTP_HOST, 587, timeout=8) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.send_message(msg)
        print(f"[EMAIL SENT via STARTTLS:587] to {to}")
        return
    except Exception as e:
        print(f"[EMAIL] STARTTLS:587 failed: {type(e).__name__}: {e}")

    print(f"[EMAIL ERROR] All SMTP strategies failed for {to}")
    raise RuntimeError(f"Could not send email to {to} via any SMTP strategy (ports 465 & 587 blocked or timed out)")


async def _send_email(to: str, subject: str, html_body: str) -> None:
    """Send email — auto-selects Resend HTTP API, Brevo HTTP API, or Gmail SMTP."""
    if not settings.SMTP_USER and not settings.RESEND_API_KEY and not settings.BREVO_API_KEY:
        logger.warning(f"[EMAIL - NO CONFIG] To={to} | Subject={subject}")
        return

    try:
        if settings.RESEND_API_KEY:
            # Use Resend HTTP API (works on Render / any cloud)
            await _send_via_resend(to, subject, html_body)
        elif settings.BREVO_API_KEY:
            # Use Brevo HTTP API (works on Render / any cloud)
            await _send_via_brevo(to, subject, html_body)
        elif settings.SMTP_USER:
            # Use Gmail SMTP (works locally)
            msg = _build_message(to, subject, html_body)
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, partial(_send_via_smtp_sync, msg, to))
        logger.info(f"[EMAIL OK] Sent real email to {to}")
    except Exception as e:
        print(f"\n[EMAIL ERROR] Failed to send to {to}: {type(e).__name__}: {e}")
        traceback.print_exc()
        logger.error(f"Email send failed ({type(e).__name__}): {e}")


async def send_otp_email(to: str, name: str, otp: str) -> None:
    print(f"\n[OTP CODE GENERATED] For Email: {to} | OTP: {otp}\n")
    logger.info(f"[OTP CODE GENERATED] For Email: {to} | OTP: {otp}")
    subject = "CampusDesk -- Your Login OTP"
    html = f"""
    <div style="font-family: Inter, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; background: #0F1115; color: #F4F4F4; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7A0F17, #8E1E24); padding: 24px 32px;">
        <h2 style="margin: 0; font-size: 20px; color: #fff;">LNMIIT Smart Booking Portal</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7);">CampusDesk</p>
      </div>
      <div style="padding: 32px;">
        <p style="margin: 0 0 8px; color: #C8C8C8;">Hi <strong style="color: #F4F4F4;">{name}</strong>,</p>
        <p style="color: #C8C8C8; margin: 0 0 24px;">Your one-time login code is:</p>
        <div style="background: #20252D; border: 1px solid #323843; border-radius: 12px; padding: 28px; text-align: center; margin: 0 0 24px;">
          <span style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #D4AF37; font-family: 'Courier New', monospace;">{otp}</span>
        </div>
        <p style="color: #8A909C; font-size: 13px; margin: 0; line-height: 1.6;">
          This code expires in <strong style="color: #C8C8C8;">5 minutes</strong> and can only be used once.<br/>
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      <div style="padding: 16px 32px; border-top: 1px solid #323843; font-size: 12px; color: #8A909C;">
        &copy; LNMIIT Smart Booking Portal - The LNM Institute of Information Technology
      </div>
    </div>
    """
    print(f"\n{'='*50}")
    print(f"  [OTP GENERATED]  {to}  ->  {otp}")
    print(f"{'='*50}\n")
    await _send_email(to, subject, html)


async def send_reminder_email(to: str, name: str, resource_name: str, start_time: str) -> None:
    subject = f"CampusDesk -- Reminder: {resource_name} starts in 1 hour"
    html = f"""
    <div style="font-family: Inter, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; background: #0F1115; color: #F4F4F4; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7A0F17, #8E1E24); padding: 24px 32px;">
        <h2 style="margin: 0; font-size: 20px; color: #fff;">Booking Reminder</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7);">LNMIIT Smart Booking Portal</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #C8C8C8; margin: 0 0 20px;">Hi <strong style="color: #F4F4F4;">{name}</strong>, your booking starts in <strong style="color: #D4AF37;">1 hour</strong>:</p>
        <div style="background: #20252D; border: 1px solid #323843; border-left: 3px solid #D4AF37; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <p style="margin: 0; font-weight: 700; font-size: 18px; color: #F4F4F4;">{resource_name}</p>
          <p style="margin: 8px 0 0; color: #8A909C; font-size: 14px;">{start_time}</p>
        </div>
        <p style="color: #8A909C; font-size: 13px; margin: 0;">See you there!</p>
      </div>
    </div>
    """
    await _send_email(to, subject, html)


async def send_waitlist_promotion_email(to: str, name: str, resource_name: str, start_time: str) -> None:
    subject = f"CampusDesk -- Good news! Slot available: {resource_name}"
    html = f"""
    <div style="font-family: Inter, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; background: #0F1115; color: #F4F4F4; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7A0F17, #8E1E24); padding: 24px 32px;">
        <h2 style="margin: 0; font-size: 20px; color: #fff;">Slot Available!</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7);">LNMIIT Smart Booking Portal</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #C8C8C8; margin: 0 0 20px;">Hi <strong style="color: #F4F4F4;">{name}</strong>, a slot you waitlisted for just opened up:</p>
        <div style="background: rgba(22,163,74,0.1); border: 1px solid rgba(22,163,74,0.3); border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <p style="margin: 0; font-weight: 700; font-size: 18px; color: #4ade80;">{resource_name}</p>
          <p style="margin: 8px 0 0; color: #86efac; font-size: 14px;">{start_time}</p>
        </div>
        <p style="color: #8A909C; font-size: 13px; margin: 0;">Log in to confirm your promoted booking before it expires.</p>
      </div>
    </div>
    """
    await _send_email(to, subject, html)
