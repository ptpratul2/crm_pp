# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FormFieldMapping(Document):
	def validate(self):
		"""Validate the mapping configuration"""
		# Check for duplicate mappings
		existing = frappe.db.exists(
			"Form Field Mapping",
			{
				"form_identifier": self.form_identifier,
				"source_field": self.source_field,
				"name": ["!=", self.name]
			}
		)
		if existing:
			frappe.throw(f"Mapping already exists for form '{self.form_identifier}' and field '{self.source_field}'")
		
		# Validate custom transformation rule if present
		if self.transformation_type == "Custom" and self.transformation_rule:
			try:
				# Test the transformation rule with a sample value
				test_value = "test"
				value = test_value  # noqa: F841
				eval(self.transformation_rule)
			except Exception as e:
				frappe.throw(f"Invalid transformation rule: {str(e)}")






