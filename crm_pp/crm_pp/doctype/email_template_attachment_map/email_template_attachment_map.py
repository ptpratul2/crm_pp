# -*- coding: utf-8 -*-
# Copyright (c) 2025, CRM PP and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class EmailTemplateAttachmentMap(Document):
	"""
	Document Controller for Email Template Attachment Map
	
	This DocType manages the mapping between Email Templates and their
	predefined PDF attachments that should be automatically included
	when emails are sent using those templates.
	"""
	
	def validate(self):
		"""
		Validate the document before saving
		"""
		# Validate that the email template exists
		if self.email_template:
			if not frappe.db.exists("Email Template", self.email_template):
				frappe.throw(f"Email Template '{self.email_template}' does not exist")
		
		# Validate that attachment file is provided
		if not self.attachment_file:
			frappe.throw("Attachment File is required")

