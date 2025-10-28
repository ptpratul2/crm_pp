// Copyright (c) 2025, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Webhook Log', {
	refresh: function(frm) {
		// Add button to view lead if successful
		if (frm.doc.lead_id) {
			frm.add_custom_button(__('View Lead'), function() {
				frappe.set_route('Form', 'Lead', frm.doc.lead_id);
			});
		}
		
		// Add button to retry failed webhook
		if (frm.doc.status === 'Failed') {
			frm.add_custom_button(__('Retry'), function() {
				retry_webhook(frm);
			});
		}
		
		// Add button to copy payload
		frm.add_custom_button(__('Copy Payload'), function() {
			navigator.clipboard.writeText(frm.doc.raw_payload);
			frappe.show_alert({
				message: __('Payload copied to clipboard'),
				indicator: 'green'
			}, 3);
		});
	}
});

function retry_webhook(frm) {
	frappe.confirm(
		__('Are you sure you want to retry processing this webhook?'),
		function() {
			frappe.call({
				method: 'crm_pp.api.webhook.retry_webhook_log',
				args: {
					log_name: frm.doc.name
				},
				callback: function(r) {
					if (r.message && r.message.status === 'success') {
						frappe.show_alert({
							message: __('Webhook processed successfully'),
							indicator: 'green'
						}, 5);
						frm.reload_doc();
					} else {
						frappe.msgprint({
							title: __('Error'),
							indicator: 'red',
							message: r.message.message || __('Failed to process webhook')
						});
					}
				}
			});
		}
	);
}

