# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class WebhookLog(Document):
	pass


def create_webhook_log(form_identifier, raw_payload, status, lead_id=None, lead_name=None, 
                        error_message=None, processing_time=None, ip_address=None, user_agent=None):
	"""Helper function to create webhook log entries"""
	try:
		log = frappe.get_doc({
			"doctype": "Webhook Log",
			"timestamp": frappe.utils.now(),
			"form_identifier": form_identifier,
			"status": status,
			"lead_id": lead_id,
			"lead_name": lead_name,
			"raw_payload": frappe.as_json(raw_payload, indent=2),
			"error_message": error_message,
			"processing_time": processing_time,
			"ip_address": ip_address,
			"user_agent": user_agent
		})
		log.insert(ignore_permissions=True)
		frappe.db.commit()
		return log.name
	except Exception as e:
		frappe.log_error(f"Failed to create webhook log: {str(e)}", "Webhook Log Error")
		return None






