// Copyright (c) 2025, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Form Integration', {
	refresh: function(frm) {
		// Add custom buttons
		if (!frm.is_new()) {
			frm.add_custom_button(__('Test Webhook'), function() {
				test_webhook(frm);
			});
			
			frm.add_custom_button(__('View Logs'), function() {
				frappe.set_route('List', 'Webhook Log', {
					'form_identifier': frm.doc.form_identifier
				});
			});
			
			frm.add_custom_button(__('Copy Webhook URL'), function() {
				navigator.clipboard.writeText(frm.doc.webhook_url);
				frappe.show_alert({
					message: __('Webhook URL copied to clipboard'),
					indicator: 'green'
				}, 3);
			});
		}
		
		// Add stats indicator
		if (frm.doc.total_submissions > 0) {
			const success_rate = ((frm.doc.successful_submissions / frm.doc.total_submissions) * 100).toFixed(1);
			frm.dashboard.add_indicator(__('Success Rate: {0}%', [success_rate]), 
				success_rate > 90 ? 'green' : success_rate > 70 ? 'orange' : 'red');
		}
	},
	
	form_identifier: function(frm) {
		// Auto-generate form title from identifier
		if (frm.doc.form_identifier && !frm.doc.form_title) {
			frm.set_value('form_title', 
				frm.doc.form_identifier
					.replace(/_/g, ' ')
					.replace(/\b\w/g, l => l.toUpperCase())
			);
		}
	}
});

frappe.ui.form.on('Form Field Map', {
	source_field: function(frm, cdt, cdn) {
		// Auto-suggest target field based on source field name
		const row = locals[cdt][cdn];
		if (row.source_field && !row.target_field) {
			const field = row.source_field.toLowerCase();
			
			// Common field mappings
			const suggestions = {
				'email': 'email_id',
				'firstname': 'first_name',
				'first_name': 'first_name',
				'lastname': 'last_name',
				'last_name': 'last_name',
				'company': 'company_name',
				'phone': 'phone',
				'mobile': 'mobile_no',
				'website': 'website',
				'message': 'notes',
				'comments': 'notes',
				'city': 'custom_city',
				'state': 'custom_state'
			};
			
			if (suggestions[field]) {
				frappe.model.set_value(cdt, cdn, 'target_field', suggestions[field]);
			}
		}
	}
});

function test_webhook(frm) {
	// Build sample data from field mappings
	let sample_data = {
		form_identifier: frm.doc.form_identifier
	};
	
	frm.doc.field_mappings.forEach(mapping => {
		sample_data[mapping.source_field] = `sample_${mapping.source_field}`;
	});
	
	// Show dialog with editable sample data
	const fields = [
		{
			fieldname: 'payload',
			fieldtype: 'Code',
			label: 'Test Payload',
			options: 'JSON',
			default: JSON.stringify(sample_data, null, 2),
			reqd: 1
		}
	];
	
	const dialog = new frappe.ui.Dialog({
		title: __('Test Webhook'),
		fields: fields,
		primary_action_label: __('Test'),
		primary_action: function(values) {
			// Parse the JSON payload
			let payload;
			try {
				payload = JSON.parse(values.payload);
			} catch (e) {
				frappe.msgprint({
					title: __('Invalid JSON'),
					indicator: 'red',
					message: __('Please enter valid JSON: {0}', [e.message])
				});
				return;
			}
			
			// Call webhook using fetch API (proper HTTP request)
			frappe.show_alert({
				message: __('Testing webhook...'),
				indicator: 'blue'
			}, 3);
			
			fetch(window.location.origin + '/api/method/crm_pp.api.webhook.handle_lead_webhook', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Frappe-CSRF-Token': frappe.csrf_token
				},
				body: JSON.stringify(payload)
			})
			.then(response => response.json())
			.then(data => {
				if (data.message && data.message.status === 'success') {
					frappe.show_alert({
						message: __('Test successful! Lead created: {0}', [data.message.lead_name]),
						indicator: 'green'
					}, 5);
					frappe.msgprint({
						title: __('Success'),
						indicator: 'green',
						message: __('Lead ID: {0}<br>Lead Name: {1}', 
							[data.message.lead_id, data.message.lead_name])
					});
					dialog.hide();
					frm.reload_doc();
				} else {
					const error_msg = data.message ? data.message.message : data.exc || 'Unknown error';
					frappe.msgprint({
						title: __('Test Failed'),
						indicator: 'red',
						message: error_msg
					});
				}
			})
			.catch(error => {
				frappe.msgprint({
					title: __('Test Failed'),
					indicator: 'red',
					message: __('Error: {0}', [error.message])
				});
			});
		}
	});
	
	dialog.show();
}

