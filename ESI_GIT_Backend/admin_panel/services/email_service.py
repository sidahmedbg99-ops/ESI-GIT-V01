from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def send_account_email(email: str, password: str, role: str):
    subject = "ESI GIT Account Created"

    login_url = f"{settings.FRONTEND_URL}/login"

    text_message = f"""
Hello,

Your {role} account has been created.

Email: {email}
Password: {password}

Login here: {login_url}

Please change your password after first login.

ESI GIT Platform
"""

    html_message = f"""
    <h2>Welcome to ESI GIT Platform 🎓</h2>

    <p>Your <b>{role}</b> account has been created.</p>

    <p><b>Email:</b> {email}</p>
    <p><b>Password:</b> {password}</p>

    <p>
        <a href="{login_url}" 
           style="padding:10px 18px;background:#0d6efd;color:white;text-decoration:none;border-radius:6px;">
           Login to your account
        </a>
    </p>

    <p>Please change your password after first login.</p>

    <br>
    <p>ESI GIT Platform</p>
    """

    try:
        email_message = EmailMultiAlternatives(
            subject,
            text_message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
        )

        email_message.attach_alternative(html_message, "text/html")
        email_message.send()

    except Exception as e:
        print("Email sending failed:", e)
