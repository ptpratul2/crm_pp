# -*- coding: utf-8 -*-
# Copyright (c) 2025, CRM PP and contributors
# For license information, please see license.txt

"""
Get Email Template Attachments for Email Dialog Integration

This module provides an API endpoint to fetch attachments configured
for a specific Email Template, designed to be used by the client-side
email dialog integration.
"""

from __future__ import unicode_literals
import frappe
from frappe import _


@frappe.whitelist()
def get_email_template_attachments(template_name):
	"""
	Return active attachments for a given email template.
	
	This method is specifically designed to be called from the client-side
	email dialog when a user selects an Email Template. It returns attachment
	details that can be automatically added to the email being composed.
	
	Args:
		template_name (str): Name of the Email Template
	
	Returns:
		list: List of attachment dictionaries with file details
		
	Example:
		>>> get_email_template_attachments("Welcome Email")
		[
			{
				"name": "file-123",
				"file_name": "welcome.pdf",
				"file_url": "/files/welcome.pdf"
			}
		]
	"""
	if not template_name:
		return []
	
	# Check if template exists
	if not frappe.db.exists("Email Template", template_name):
		frappe.log_error(
			f"Email Template '{template_name}' does not exist",
			"Get Email Template Attachments"
		)
		return []
	
	# Fetch active attachment mappings
	mappings = frappe.get_all(
		"Email Template Attachment Map",
		filters={
			"email_template": template_name,
			"is_active": 1
		},
		fields=["attachment_file", "name"]
	)
	
	attachments = []
	for mapping in mappings:
		if not mapping.attachment_file:
			continue
		
		try:
			# Get file document details
			file_doc = frappe.get_doc("File", {"file_url": mapping.attachment_file})
			
			attachments.append({
				"name": file_doc.name,
				"file_name": file_doc.file_name,
				"file_url": file_doc.file_url,
				"is_private": file_doc.is_private or 0
			})
			
		except Exception as e:
			# Log error but continue with other attachments
			frappe.log_error(
				f"Error fetching file for mapping {mapping.name}: {str(e)}",
				"Get Email Template Attachments Error"
			)
			continue
	
	return attachments


@frappe.whitelist()
def get_template_attachment_count(template_name):
	"""
	Get count of active attachments for a template.
	
	Quick method to check if a template has attachments without
	fetching all the details.
	
	Args:
		template_name (str): Name of the Email Template
	
	Returns:
		int: Number of active attachments
	"""
	if not template_name:
		return 0
	
	count = frappe.db.count(
		"Email Template Attachment Map",
		filters={
			"email_template": template_name,
			"is_active": 1
		}
	)
	
	return count


