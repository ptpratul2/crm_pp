


import frappe
from frappe import _

def custom_send_welcome_mail_to_user(self):
    print("Sending custom Prompt CRM welcome email =========================")
    from frappe.utils import get_url

    link = self.reset_password()

    subject = "Welcome to Prompt CRM – Your Account Has Been Created"

    crm_login_url = "https://crm.promptpersonnel.com"

    message = f"""
    <p>Welcome to <b>Prompt Personnel CRM!</b></p>
    <p>Dear {self.first_name or self.full_name},</p>
    <p>We’re delighted to inform you that your account has been successfully created in Prompt CRM.</p>

    <p>You can now log in with the following details:</p>
    <ul>
        <li><b>URL:</b> <a href="{crm_login_url}">{crm_login_url}</a></li>
        <li><b>Username:</b> {self.email}</li>
    </ul>

    <p>👉 To get started, please click the link below to complete your registration and set a new password:</p>
    <p><a href="{link}" style="background-color:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Complete Registration</a></p>

    <p>Alternatively, you can copy and paste the link below into your browser:</p>
    <p>{link}</p>

    <p>For your security, this link will expire in 24 hours. If it expires, you can request a new password reset from the login page.</p>
    <p>If you did not expect this email, please ignore it.</p>

    <br>
    <p>Best regards,<br>
    <b>Prompt CRM Support Team</b></p>
    """

    frappe.sendmail(
        recipients=[self.email],
        subject=subject,
        message=message,
        delayed=False
    )

    print(f"Welcome email sent to {self.email}")
