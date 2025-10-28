# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
import json
import time
from frappe import _
from frappe.utils import cint, get_datetime
from crm_pp.crm_pp.doctype.webhook_log.webhook_log import create_webhook_log


# Rate limiting cache
RATE_LIMIT_CACHE = {}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def handle_lead_webhook():
	"""
	Main webhook endpoint to handle external form submissions
	Endpoint: /api/method/crm_pp.api.webhook.handle_lead_webhook
	"""
	start_time = time.time()
	
	try:
		# Get request data
		request = frappe.local.request
		ip_address = frappe.local.request_ip
		user_agent = request.headers.get('User-Agent', '')
		
		# Rate limiting check
		if not check_rate_limit(ip_address):
			return {
				"status": "error",
				"message": "Rate limit exceeded. Please try again later."
			}
		
		# Parse payload based on content type
		content_type = request.headers.get('Content-Type', '')
		
		if 'application/json' in content_type:
			payload = json.loads(request.get_data())
		elif 'application/x-www-form-urlencoded' in content_type or 'multipart/form-data' in content_type:
			payload = dict(request.form)
		else:
			payload = dict(request.form) if request.form else json.loads(request.get_data())
		
		# Validate API key if enabled
		api_key = payload.get('api_key') or request.headers.get('X-API-Key')
		if not validate_api_key(api_key):
			create_webhook_log(
				form_identifier='Unknown',
				raw_payload=payload,
				status='Failed',
				error_message='Invalid or missing API key',
				ip_address=ip_address,
				user_agent=user_agent
			)
			return {
				"status": "error",
				"message": "Invalid or missing API key"
			}
		
		# Detect form identifier
		form_identifier = detect_form_identifier(payload)
		
		if not form_identifier:
			create_webhook_log(
				form_identifier='Unknown',
				raw_payload=payload,
				status='Failed',
				error_message='Unable to detect form identifier',
				ip_address=ip_address,
				user_agent=user_agent
			)
			return {
				"status": "error",
				"message": "Unable to detect form identifier. Please include 'form_identifier', 'retURL', or 'page_url' in the payload."
			}
		
		# Get field mappings for this form
		mappings = get_field_mappings(form_identifier)
		
		if not mappings:
			# Log but don't create lead if no mappings exist
			create_webhook_log(
				form_identifier=form_identifier,
				raw_payload=payload,
				status='Failed',
				error_message=f'No field mappings found for form: {form_identifier}',
				ip_address=ip_address,
				user_agent=user_agent
			)
			return {
				"status": "error",
				"message": f"No field mappings configured for form: {form_identifier}"
			}
		
		# Transform and map fields
		lead_data = transform_payload(payload, mappings)
		
		# Create lead
		lead = create_lead(lead_data)
		
		# Calculate processing time
		processing_time = time.time() - start_time
		
		# Update Form Integration statistics
		if frappe.db.exists("Form Integration", form_identifier):
			try:
				form_doc = frappe.get_doc("Form Integration", form_identifier)
				form_doc.update_statistics(success=True)
			except Exception:
				pass  # Don't fail webhook if stats update fails
		
		# Log success
		create_webhook_log(
			form_identifier=form_identifier,
			raw_payload=payload,
			status='Success',
			lead_id=lead.name,
			lead_name=lead.lead_name,
			processing_time=processing_time,
			ip_address=ip_address,
			user_agent=user_agent
		)
		
		return {
			"status": "success",
			"lead_name": lead.lead_name,
			"lead_id": lead.name,
			"message": "Lead created successfully"
		}
		
	except Exception as e:
		processing_time = time.time() - start_time
		error_message = str(e)
		frappe.log_error(f"Webhook Error: {error_message}", "Lead Webhook Handler")
		
		# Update Form Integration statistics
		if 'form_identifier' in locals() and frappe.db.exists("Form Integration", form_identifier):
			try:
				form_doc = frappe.get_doc("Form Integration", form_identifier)
				form_doc.update_statistics(success=False)
			except Exception:
				pass  # Don't fail webhook if stats update fails
		
		# Log failure
		create_webhook_log(
			form_identifier=form_identifier if 'form_identifier' in locals() else 'Unknown',
			raw_payload=payload if 'payload' in locals() else {},
			status='Failed',
			error_message=error_message,
			processing_time=processing_time,
			ip_address=ip_address if 'ip_address' in locals() else None,
			user_agent=user_agent if 'user_agent' in locals() else None
		)
		
		return {
			"status": "error",
			"message": error_message
		}


def detect_form_identifier(payload):
	"""Detect form identifier from various sources"""
	# Check for explicit form_identifier
	if payload.get('form_identifier'):
		return payload.get('form_identifier')
	
	# Check retURL (Salesforce style)
	if payload.get('retURL'):
		return extract_identifier_from_url(payload.get('retURL'))
	
	# Check page_url
	if payload.get('page_url'):
		return extract_identifier_from_url(payload.get('page_url'))
	
	# Check oid (Salesforce organization ID as fallback)
	if payload.get('oid'):
		return f"salesforce_{payload.get('oid')}"
	
	return None


def extract_identifier_from_url(url):
	"""Extract form identifier from URL"""
	# Remove protocol and domain
	if '//' in url:
		url = url.split('//')[-1]
	
	# Get path segments
	segments = url.split('/')
	
	# Try to find meaningful identifier
	for segment in segments:
		if segment and segment not in ['www', 'http:', 'https:']:
			# Clean and return first meaningful segment
			return segment.split('?')[0].split('#')[0].replace('.html', '').replace('.php', '')
	
	return 'default'


def get_field_mappings(form_identifier):
	"""Get all field mappings for a form"""
	# Try new Form Integration structure first
	if frappe.db.exists("Form Integration", form_identifier):
		from crm_pp.crm_pp.doctype.form_integration.form_integration import get_field_mappings as get_mappings
		return get_mappings(form_identifier)
	
	# Fallback to old Form Field Mapping structure
	mappings = frappe.get_all(
		'Form Field Mapping',
		filters={'form_identifier': form_identifier},
		fields=['source_field', 'target_field', 'is_required', 'default_value', 
		        'transformation_type', 'transformation_rule']
	)
	return mappings


def transform_payload(payload, mappings):
	"""Transform payload data according to field mappings"""
	lead_data = {}
	missing_required = []
	
	for mapping in mappings:
		source_field = mapping['source_field']
		target_field = mapping['target_field']
		value = payload.get(source_field)
		
		# Check required fields
		if mapping.get('is_required') and not value:
			if mapping.get('default_value'):
				value = mapping.get('default_value')
			else:
				missing_required.append(source_field)
				continue
		
		# Use default value if empty
		if not value and mapping.get('default_value'):
			value = mapping.get('default_value')
		
		# Apply transformation
		if value:
			value = apply_transformation(value, mapping)
		
		# Set the mapped value
		if value:
			lead_data[target_field] = value
	
	if missing_required:
		raise Exception(f"Missing required fields: {', '.join(missing_required)}")
	
	return lead_data


def apply_transformation(value, mapping):
	"""Apply transformation rules to field value"""
	transformation_type = mapping.get('transformation_type')
	
	if not transformation_type or transformation_type == 'None':
		return value
	
	value = str(value)
	
	if transformation_type == 'Uppercase':
		return value.upper()
	elif transformation_type == 'Lowercase':
		return value.lower()
	elif transformation_type == 'Title Case':
		return value.title()
	elif transformation_type == 'Trim':
		return value.strip()
	elif transformation_type == 'Remove Special Characters':
		import re
		return re.sub(r'[^a-zA-Z0-9\s]', '', value)
	elif transformation_type == 'Custom':
		rule = mapping.get('transformation_rule')
		if rule:
			try:
				# Execute custom transformation
				return eval(rule)
			except Exception as e:
				frappe.log_error(f"Custom transformation error: {str(e)}", "Field Transformation")
				return value
	
	return value


def create_lead(lead_data):
	"""Create a new lead with the transformed data"""
	# Ensure required fields
	if not lead_data.get('lead_name') and not lead_data.get('email_id'):
		# Try to construct lead_name from first_name and last_name
		if lead_data.get('first_name'):
			lead_name = lead_data.get('first_name')
			if lead_data.get('last_name'):
				lead_name += ' ' + lead_data.get('last_name')
			lead_data['lead_name'] = lead_name
		elif lead_data.get('email_id'):
			lead_data['lead_name'] = lead_data.get('email_id').split('@')[0]
		else:
			lead_data['lead_name'] = 'Web Lead'
	
	# Create lead document
	lead = frappe.get_doc({
		"doctype": "Lead",
		**lead_data
	})
	
	lead.insert(ignore_permissions=True)
	frappe.db.commit()
	
	return lead


def check_rate_limit(ip_address, max_requests=10, time_window=60):
	"""Simple rate limiting - max_requests per time_window seconds"""
	current_time = time.time()
	
	# Clean old entries
	for ip in list(RATE_LIMIT_CACHE.keys()):
		RATE_LIMIT_CACHE[ip] = [t for t in RATE_LIMIT_CACHE[ip] if current_time - t < time_window]
		if not RATE_LIMIT_CACHE[ip]:
			del RATE_LIMIT_CACHE[ip]
	
	# Check current IP
	if ip_address not in RATE_LIMIT_CACHE:
		RATE_LIMIT_CACHE[ip_address] = []
	
	if len(RATE_LIMIT_CACHE[ip_address]) >= max_requests:
		return False
	
	RATE_LIMIT_CACHE[ip_address].append(current_time)
	return True


def validate_api_key(api_key):
	"""Validate API key if security is enabled"""
	# Check if API key validation is enabled
	webhook_settings = frappe.db.get_singles_dict('CRM PP Settings')
	
	if not webhook_settings or not webhook_settings.get('enable_webhook_api_key'):
		# API key validation is disabled
		return True
	
	# Get configured API key
	configured_key = webhook_settings.get('webhook_api_key')
	
	if not configured_key:
		# No key configured, allow all
		return True
	
	# Validate the provided key
	return api_key == configured_key


@frappe.whitelist()
def get_mappings(form_identifier=None):
	"""Get all field mappings, optionally filtered by form identifier"""
	filters = {}
	if form_identifier:
		filters['form_identifier'] = form_identifier
	
	mappings = frappe.get_all(
		'Form Field Mapping',
		filters=filters,
		fields=['name', 'form_identifier', 'source_field', 'target_field', 'is_required', 'default_value']
	)
	
	return mappings


@frappe.whitelist()
def retry_webhook_log(log_name):
	"""Retry processing a failed webhook"""
	log = frappe.get_doc('Webhook Log', log_name)
	
	if log.status == 'Success':
		return {
			"status": "error",
			"message": "This webhook was already processed successfully"
		}
	
	try:
		# Parse the raw payload
		payload = json.loads(log.raw_payload)
		
		# Get form identifier
		form_identifier = log.form_identifier or detect_form_identifier(payload)
		
		# Get mappings
		mappings = get_field_mappings(form_identifier)
		
		if not mappings:
			return {
				"status": "error",
				"message": f"No field mappings found for form: {form_identifier}"
			}
		
		# Transform and create lead
		lead_data = transform_payload(payload, mappings)
		lead = create_lead(lead_data)
		
		# Update log
		log.status = 'Success'
		log.lead_id = lead.name
		log.lead_name = lead.lead_name
		log.error_message = None
		log.save(ignore_permissions=True)
		frappe.db.commit()
		
		return {
			"status": "success",
			"lead_id": lead.name,
			"lead_name": lead.lead_name
		}
		
	except Exception as e:
		return {
			"status": "error",
			"message": str(e)
		}


@frappe.whitelist()
def test_field_transformation(mapping_name, test_value):
	"""Test a field transformation"""
	mapping = frappe.get_doc('Form Field Mapping', mapping_name)
	
	result = apply_transformation(test_value, {
		'transformation_type': mapping.transformation_type,
		'transformation_rule': mapping.transformation_rule
	})
	
	return result

