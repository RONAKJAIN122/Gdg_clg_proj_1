"""
Email service using aiosmtplib (async SMTP).
Configured for Ethereal Mail (free fake inbox).
View sent emails at: https://ethereal.email/messages
"""
import logging

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)

ETHEREAL_INBOX = "https://ethereal.email/messages"


async def _send_email(to: str, subject: str, html_body: str) -> None:
    """Send an email via Ethereal SMTP (STARTTLS on port 587)."""
    msg = MIMEMultipart("alternative")
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    if not settings.SMTP_USER:
        # No SMTP configured — console only
        logger.warning(f"[EMAIL - NO SMTP] To={to} | Subject={subject}")
        return

    try:
        # Ethereal uses port 587 with STARTTLS (not SSL)
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            use_tls=False,      # Do NOT wrap socket in SSL
            start_tls=True,     # Use STARTTLS upgrade after connect
        )
        logger.info(f"[EMAIL OK] Sent to {to} | View inbox: {ETHEREAL_INBOX}")
        print(f"\n[EMAIL SENT] To={to} | View: {ETHEREAL_INBOX}\n")
    except Exception as e:
        logger.error(f"Email send failed ({type(e).__name__}): {e}")
        logger.info(f"[EMAIL FALLBACK] Could not deliver to {to}")


async def send_otp_email(to: str, name: str, otp: str) -> None:
    subject = "CampusDesk — Your Login OTP"
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
        © LNMIIT Smart Booking Portal · The LNM Institute of Information Technology
      </div>
    </div>
    """
    # Always print OTP to console as a fallback
    print(f"\n{'='*50}")
    print(f"  [OTP]  {to}  ->  {otp}")
    print(f"  View inbox: {ETHEREAL_INBOX}")
    print(f"{'='*50}\n")
    await _send_email(to, subject, html)


async def send_reminder_email(to: str, name: str, resource_name: str, start_time: str) -> None:
    subject = f"CampusDesk — Reminder: {resource_name} starts in 1 hour"
    html = f"""
    <div style="font-family: Inter, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; background: #0F1115; color: #F4F4F4; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7A0F17, #8E1E24); padding: 24px 32px;">
        <h2 style="margin: 0; font-size: 20px; color: #fff;">⏰ Booking Reminder</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7);">LNMIIT Smart Booking Portal</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #C8C8C8; margin: 0 0 20px;">Hi <strong style="color: #F4F4F4;">{name}</strong>, your booking starts in <strong style="color: #D4AF37;">1 hour</strong>:</p>
        <div style="background: #20252D; border: 1px solid #323843; border-left: 3px solid #D4AF37; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <p style="margin: 0; font-weight: 700; font-size: 18px; color: #F4F4F4;">{resource_name}</p>
          <p style="margin: 8px 0 0; color: #8A909C; font-size: 14px;">{start_time}</p>
        </div>
        <p style="color: #8A909C; font-size: 13px; margin: 0;">See you there! 👋</p>
      </div>
    </div>
    """
    await _send_email(to, subject, html)


async def send_waitlist_promotion_email(to: str, name: str, resource_name: str, start_time: str) -> None:
    subject = f"CampusDesk — Good news! Slot available: {resource_name}"
    html = f"""
    <div style="font-family: Inter, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; background: #0F1115; color: #F4F4F4; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7A0F17, #8E1E24); padding: 24px 32px;">
        <h2 style="margin: 0; font-size: 20px; color: #fff;">🎉 Slot Available!</h2>
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
