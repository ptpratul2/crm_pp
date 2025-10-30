# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FormIntegration(Document):
	def validate(self):
		"""Validate form integration settings"""
		# Check for duplicate source fields
		source_fields = []
		for mapping in self.field_mappings:
			if mapping.source_field in source_fields:
				frappe.throw(f"Duplicate source field: {mapping.source_field}")
			source_fields.append(mapping.source_field)
		
		# Validate custom transformations
		for mapping in self.field_mappings:
			if mapping.transformation_type == "Custom" and mapping.transformation_rule:
				try:
					test_value = "test"
					value = test_value  # noqa: F841
					eval(mapping.transformation_rule)
				except Exception as e:
					frappe.throw(f"Invalid transformation rule for {mapping.source_field}: {str(e)}")
	
	def before_save(self):
		"""Auto-generate webhook URL and examples"""
		site_url = frappe.utils.get_url()
		webhook_endpoint = f"{site_url}/api/method/crm_pp.api.webhook.handle_lead_webhook"
		
		# Set webhook URL
		self.webhook_url = webhook_endpoint
		
		# Generate HTML example
		self.html_example = self.generate_html_example()
		
		# Generate JavaScript example
		self.javascript_example = self.generate_javascript_example()
	
	def generate_html_example(self):
		"""Generate HTML form example"""
		fields_html = []
		for mapping in self.field_mappings:
			field_type = "email" if mapping.target_field == "email_id" else "text"
			required = "required" if mapping.is_required else ""
			fields_html.append(
				f'  <input type="{field_type}" name="{mapping.source_field}" '
				f'placeholder="{mapping.target_field}" {required}>'
			)
		
		return f'''<form id="leadForm">
  <input type="hidden" name="form_identifier" value="{self.form_identifier}">
  
{chr(10).join(fields_html)}
  
  <button type="submit">Submit</button>
</form>

<script src="https://crm.promptpersonnel.com/api/method/crm_pp.api.webhook/form_script.js"></script>
<script>
document.getElementById('leadForm').addEventListener('submit', async (e) => {{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  
  const response = await fetch('{self.webhook_url}', {{
    method: 'POST',
    headers: {{ 'Content-Type': 'application/json' }},
    body: JSON.stringify(data)
  }});
  
  const result = await response.json();
  if (result.status === 'success') {{
    alert('Thank you! We will contact you soon.');
    e.target.reset();
  }} else {{
    alert('Error: ' + result.message);
  }}
}});
</script>'''
	
	def generate_javascript_example(self):
		"""Generate JavaScript fetch example"""
		sample_data = {"form_identifier": self.form_identifier}
		for mapping in self.field_mappings:
			sample_data[mapping.source_field] = f"sample_{mapping.source_field}"
		
		return f'''// Using fetch API
fetch('{self.webhook_url}', {{
  method: 'POST',
  headers: {{
    'Content-Type': 'application/json'
  }},
  body: JSON.stringify({frappe.as_json(sample_data, indent=2)})
}})
.then(response => response.json())
.then(data => {{
  if (data.status === 'success') {{
    console.log('Lead created:', data.lead_id);
  }} else {{
    console.error('Error:', data.message);
  }}
}})
.catch(error => console.error('Error:', error));'''
	
	def update_statistics(self, success=True):
		"""Update submission statistics"""
		self.total_submissions = (self.total_submissions or 0) + 1
		if success:
			self.successful_submissions = (self.successful_submissions or 0) + 1
		else:
			self.failed_submissions = (self.failed_submissions or 0) + 1
		self.last_submission_date = frappe.utils.now()
		self.save(ignore_permissions=True)


@frappe.whitelist()
def get_field_mappings(form_identifier):
	"""Get field mappings for a form identifier"""
	if not frappe.db.exists("Form Integration", form_identifier):
		return []
	
	doc = frappe.get_doc("Form Integration", form_identifier)
	return [
		{
			"source_field": m.source_field,
			"target_field": m.target_field,
			"is_required": m.is_required,
			"default_value": m.default_value,
			"transformation_type": m.transformation_type,
			"transformation_rule": m.transformation_rule
		}
		for m in doc.field_mappings
	]






