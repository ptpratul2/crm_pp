# Copyright (c) 2025, Frappe Technologies and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestFormFieldMapping(FrappeTestCase):
	def setUp(self):
		# Clean up test data
		frappe.db.delete("Form Field Mapping", {"form_identifier": "test_form"})
		frappe.db.commit()
	
	def test_create_mapping(self):
		"""Test creating a field mapping"""
		mapping = frappe.get_doc({
			"doctype": "Form Field Mapping",
			"form_identifier": "test_form",
			"source_field": "email",
			"target_field": "email_id",
			"is_required": 1
		})
		mapping.insert()
		
		self.assertTrue(mapping.name)
		self.assertEqual(mapping.source_field, "email")
	
	def test_duplicate_mapping(self):
		"""Test that duplicate mappings are prevented"""
		# Create first mapping
		mapping1 = frappe.get_doc({
			"doctype": "Form Field Mapping",
			"form_identifier": "test_form",
			"source_field": "email",
			"target_field": "email_id"
		})
		mapping1.insert()
		
		# Try to create duplicate
		mapping2 = frappe.get_doc({
			"doctype": "Form Field Mapping",
			"form_identifier": "test_form",
			"source_field": "email",
			"target_field": "lead_name"
		})
		
		with self.assertRaises(Exception):
			mapping2.insert()
	
	def test_transformation_validation(self):
		"""Test custom transformation rule validation"""
		mapping = frappe.get_doc({
			"doctype": "Form Field Mapping",
			"form_identifier": "test_form",
			"source_field": "test_field",
			"target_field": "lead_name",
			"transformation_type": "Custom",
			"transformation_rule": "invalid python code {["
		})
		
		with self.assertRaises(Exception):
			mapping.insert()
	
	def tearDown(self):
		# Clean up test data
		frappe.db.delete("Form Field Mapping", {"form_identifier": "test_form"})
		frappe.db.commit()

