__version__ = "0.0.1"





from erpnext.crm.doctype.opportunity import opportunity
from crm_pp.crm_pp.opportunity_override import do_nothing_after_insert

opportunity.Opportunity.after_insert = do_nothing_after_insert

import frappe
from frappe.core.doctype.user.user import User
from crm_pp.crm_pp.custom_email_template import custom_send_welcome_mail_to_user

User.send_welcome_mail_to_user = custom_send_welcome_mail_to_user

