__version__ = "0.0.1"
import frappe
import frappe.email.receive
from frappe.utils import cint
from contextlib import suppress




from erpnext.crm.doctype.opportunity import opportunity
from crm_pp.crm_pp.opportunity_override import do_nothing_after_insert

opportunity.Opportunity.after_insert = do_nothing_after_insert

import frappe
from frappe.core.doctype.user.user import User
from crm_pp.crm_pp.custom_email_template import custom_send_welcome_mail_to_user

User.send_welcome_mail_to_user = custom_send_welcome_mail_to_user



# 1. Define the custom function (Fixed logic to keep emails unread)
def custom_post_retrieve_cleanup(self, uid, msg_num):
    with suppress(Exception):
        if not cint(self.settings.use_imap):
            self.pop.dele(msg_num)
        else:
            # This prevents Gmail/Outlook inbox mails from being marked as READ
            pass

# 2. Apply the Monkey Patch to the core class
# This replaces the original method with your custom method
frappe.email.receive.EmailServer._post_retrieve_cleanup = custom_post_retrieve_cleanup