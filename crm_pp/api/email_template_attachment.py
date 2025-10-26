# -*- coding: utf-8 -*-
# Copyright (c) 2025, CRM PP and contributors
# For license information, please see license.txt

"""
Email Template Attachment API

This module provides functionality to send emails using Email Templates
with automatically attached predefined PDF files based on the 
Email Template Attachment Map DocType.
"""

from __future__ import unicode_literals
import frappe
import os
from frappe import _


@frappe.whitelist()
def send_template_email_with_attachment(template_name, recipient, context_json=None):
	"""
	Send an email using a template with predefined attachments
	
	Args:
		template_name (str): Name of the Email Template to use
		recipient (str): Email address of the recipient (can be comma-separated for multiple recipients)
		context_json (str, optional): JSON string containing context variables for template rendering
	
	Returns:
		str: Success message with details about the email sent
	
	Raises:
		frappe.ValidationError: If template_name or recipient is not provided
		frappe.DoesNotExistError: If the email template doesn't exist
	
	Example:
		>>> send_template_email_with_attachment(
		...     template_name="Welcome Email",
		...     recipient="user@example.com",
		...     context_json='{"name": "John Doe", "company": "Acme Corp"}'
		... )
		'Email sent to user@example.com using template Welcome Email with 2 attachment(s).'
	"""
	
	# Validate required parameters
	if not template_name or not recipient:
		frappe.throw(_("Template Name and Recipient are required."))
	
	# Fetch Email Template
	if not frappe.db.exists("Email Template", template_name):
		frappe.throw(_("Email Template '{0}' does not exist").format(template_name))
	
	template = frappe.get_doc("Email Template", template_name)
	
	# Parse context for template rendering
	context = frappe.parse_json(context_json) if context_json else {}
	
	# Render subject and message
	subject = frappe.render_template(template.subject or "", context)
	message = frappe.render_template(template.response or "", context)
	
	# Fetch attachment mappings for this template
	mappings = frappe.get_all(
		"Email Template Attachment Map",
		filters={
			"email_template": template_name,
			"is_active": 1
		},
		fields=["attachment_file", "name"]
	)
	
	# Prepare attachments list
	attachments = []
	for mapping in mappings:
		if not mapping.attachment_file:
			frappe.log_error(
				f"No attachment file found for mapping: {mapping.name}",
				"Email Template Attachment Warning"
			)
			continue
		
		try:
			# Get file document by file_url
			file_url = mapping.attachment_file
			file_list = frappe.get_all("File", filters={"file_url": file_url}, fields=["name", "file_name", "file_url", "is_private"])
			
			if not file_list:
				frappe.log_error(
					f"File not found in system with URL: {file_url} for mapping: {mapping.name}",
					"Email Template Attachment Error"
				)
				continue
			
			file_info = file_list[0]
			file_doc = frappe.get_doc("File", file_info.name)
			
			# Get the file path
			# Always use get_full_path if available (most reliable)
			if hasattr(file_doc, 'get_full_path'):
				file_path = file_doc.get_full_path()
			else:
				# Manual path construction - use actual filename from URL, not display name
				if file_doc.is_private:
					# For private files - extract actual filename from URL
					# URL format: /private/files/actual_filename.pdf
					filename = file_url.split('/')[-1]
					file_path = frappe.get_site_path("private", "files", filename)
				else:
					# For public files - use URL directly
					# Remove leading slash from URL
					file_path = frappe.get_site_path("public", file_url.lstrip("/"))
			
			# Verify file exists
			if not os.path.exists(file_path):
				frappe.log_error(
					f"File not found at path: {file_path} for mapping: {mapping.name}",
					"Email Template Attachment Error"
				)
				continue
			
			# Read file content and add to attachments
			with open(file_path, "rb") as f:
				file_content = f.read()
			
			attachments.append({
				"fname": file_doc.file_name,
				"fcontent": file_content
			})
			
			# Log success for debugging (only in developer mode)
			if frappe.conf.get('developer_mode'):
				frappe.log_error(
					f"Attached: {file_doc.file_name}",
					"Email Attachment Debug"
				)
			
		except Exception as e:
			frappe.log_error(
				frappe.get_traceback(),
				f"Error processing attachment for mapping: {mapping.name}"
			)
			# Continue processing other attachments even if one fails
			continue
	
	# Parse recipients (handle comma-separated emails)
	recipient_list = [r.strip() for r in recipient.split(",") if r.strip()]
	
	# Send email
	try:
		frappe.sendmail(
			recipients=recipient_list,
			subject=subject,
			message=message,
			attachments=attachments,
			reference_doctype="Email Template",
			reference_name=template_name
		)
		
		return _(f"Email sent to {', '.join(recipient_list)} using template '{template_name}' with {len(attachments)} attachment(s).")
	
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Email Send Failed")
		frappe.throw(_("Failed to send email. Please check error logs for details."))


@frappe.whitelist()
def get_template_attachments(template_name):
	"""
	Get list of attachments configured for a given email template
	
	Args:
		template_name (str): Name of the Email Template
	
	Returns:
		list: List of attachment file details
	
	Example:
		>>> get_template_attachments("Welcome Email")
		[
			{
				"name": "ETAM-00001",
				"attachment_file": "/files/welcome.pdf",
				"is_active": 1
			}
		]
	"""
	if not template_name:
		frappe.throw(_("Template Name is required"))
	
	mappings = frappe.get_all(
		"Email Template Attachment Map",
		filters={
			"email_template": template_name,
			"is_active": 1
		},
		fields=["name", "attachment_file", "is_active", "modified"]
	)
	
	return mappings


@frappe.whitelist()
def validate_template_and_attachments(template_name):
	"""
	Validate if a template exists and has active attachments configured
	
	Args:
		template_name (str): Name of the Email Template
	
	Returns:
		dict: Validation result with status and details
	
	Example:
		>>> validate_template_and_attachments("Welcome Email")
		{
			"valid": True,
			"template_exists": True,
			"attachment_count": 2,
			"message": "Template is valid with 2 attachment(s)"
		}
	"""
	result = {
		"valid": False,
		"template_exists": False,
		"attachment_count": 0,
		"message": ""
	}
	
	if not template_name:
		result["message"] = "Template Name is required"
		return result
	
	# Check if template exists
	if not frappe.db.exists("Email Template", template_name):
		result["message"] = f"Email Template '{template_name}' does not exist"
		return result
	
	result["template_exists"] = True
	
	# Count active attachments
	attachment_count = frappe.db.count(
		"Email Template Attachment Map",
		filters={
			"email_template": template_name,
			"is_active": 1
		}
	)
	
	result["attachment_count"] = attachment_count
	
	if attachment_count > 0:
		result["valid"] = True
		result["message"] = f"Template is valid with {attachment_count} attachment(s)"
	else:
		result["message"] = f"Template '{template_name}' has no active attachments configured"
	
	return result

