"""Email service for sending SMTP emails."""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP."""

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS

    def is_configured(self) -> bool:
        """Check if SMTP is properly configured."""
        return bool(self.host and self.user and self.password)

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email via SMTP.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML body content
            text_content: Plain text body (optional, derived from HTML if not provided)

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("SMTP not configured, skipping email send")
            return False

        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            # Add plain text version
            if text_content:
                part1 = MIMEText(text_content, "plain", "utf-8")
                msg.attach(part1)

            # Add HTML version
            part2 = MIMEText(html_content, "html", "utf-8")
            msg.attach(part2)

            # Connect and send
            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.from_email, to_email, msg.as_string())

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed: {e}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error sending email to {to_email}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {e}")
            return False

    def send_customer_order_link(
        self,
        to_email: str,
        customer_name: str,
        order_link: str,
        expires_at: datetime
    ) -> bool:
        """
        Send customer order link email.

        Args:
            to_email: Customer email address
            customer_name: Customer name for personalization
            order_link: The unique order link
            expires_at: When the link expires

        Returns:
            True if email was sent successfully
        """
        expires_formatted = expires_at.strftime("%d. %B %Y")

        subject = "Bestillingslenke fra Larvik Kommunale Catering"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="width: 50px; height: 50px; border: 2px solid #ffffff; border-radius: 50%; text-align: center; vertical-align: middle;">
                                        <span style="color: #ffffff; font-size: 14px; font-weight: bold;">NER</span>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <div style="color: #ffffff; font-size: 24px; font-weight: bold;">LKC</div>
                                        <div style="color: #cccccc; font-size: 12px;">Larvik Kommunale Catering</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px;">
                            <h1 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px;">
                                Hei, {customer_name}!
                            </h1>
                            <p style="margin: 0 0 24px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                                Du har mottatt en lenke for a legge inn din bestilling hos Larvik Kommunale Catering.
                            </p>

                            <!-- Button -->
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto 24px auto;">
                                <tr>
                                    <td style="background-color: #2563eb; border-radius: 6px;">
                                        <a href="{order_link}"
                                           style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                                            Apne bestillingsskjema
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 16px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                                Eller kopier denne lenken til nettleseren din:
                            </p>
                            <p style="margin: 0 0 24px 0; padding: 12px; background-color: #f5f5f5; border-radius: 4px; word-break: break-all;">
                                <a href="{order_link}" style="color: #2563eb; text-decoration: none; font-size: 14px;">
                                    {order_link}
                                </a>
                            </p>

                            <!-- Warning -->
                            <table cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 6px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                                            <strong>Viktig:</strong> Denne lenken er gyldig til {expires_formatted}.
                                            Etter denne datoen ma du be om en ny lenke.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0; color: #999999; font-size: 14px;">
                                Hvis du har sporsmal, ta kontakt med oss pa telefon eller e-post.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px 0; color: #666666; font-size: 14px; text-align: center;">
                                <strong>Larvik Kommunale Catering</strong>
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                                Vikingveien 4, 3274 Larvik
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        text_content = f"""
Hei, {customer_name}!

Du har mottatt en lenke for a legge inn din bestilling hos Larvik Kommunale Catering.

Apne bestillingsskjema: {order_link}

Viktig: Denne lenken er gyldig til {expires_formatted}.
Etter denne datoen ma du be om en ny lenke.

Hvis du har sporsmal, ta kontakt med oss pa telefon eller e-post.

Med vennlig hilsen,
Larvik Kommunale Catering
Vikingveien 4, 3274 Larvik
"""

        return self.send_email(to_email, subject, html_content, text_content)


# Singleton instance
email_service = EmailService()
