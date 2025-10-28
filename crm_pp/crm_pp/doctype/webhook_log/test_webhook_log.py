# Copyright (c) 2025, Frappe Technologies and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from crm_pp.crm_pp.doctype.webhook_log.webhook_log import create_webhook_log


class TestWebhookLog(FrappeTestCase):
	def test_create_log(self):
		"""Test creating a webhook log"""
		log_name = create_webhook_log(
			form_identifier="test_form",
			raw_payload={"test": "data"},
			status="Success",
			lead_name="Test Lead",
			processing_time=0.5
		)
		
		self.assertTrue(log_name)
		
		log = frappe.get_doc("Webhook Log", log_name)
		self.assertEqual(log.form_identifier, "test_form")
		self.assertEqual(log.status, "Success")
		
		# Clean up
		frappe.delete_doc("Webhook Log", log_name)
	
	def test_log_error(self):
		"""Test logging failed webhook"""
		log_name = create_webhook_log(
			form_identifier="test_form",
			raw_payload={"test": "data"},
			status="Failed",
			error_message="Test error message"
		)
		
		self.assertTrue(log_name)
		
		log = frappe.get_doc("Webhook Log", log_name)
		self.assertEqual(log.status, "Failed")
		self.assertTrue(log.error_message)
		
		# Clean up
		frappe.delete_doc("Webhook Log", log_name)

