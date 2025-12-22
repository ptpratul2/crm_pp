// Copyright (c) 2025, CRM PP and contributors
// For license information, please see license.txt

frappe.ui.form.on('Email Template Attachment Map', {
	refresh: function(frm) {
		// Add custom button to test the email template with attachments
		if (!frm.is_new()) {
			frm.add_custom_button(__('Preview Attachments'), function() {
				if (frm.doc.email_template) {
					frappe.call({
						method: 'crm_pp.api.email_template_attachment.get_template_attachments',
						args: {
							template_name: frm.doc.email_template
						},
						callback: function(r) {
							if (r.message) {
								let attachments = r.message;
								let message = `<h4>Attachments for Template: ${frm.doc.email_template}</h4>`;
								message += '<ul>';
								attachments.forEach(function(att) {
									message += `<li><a href="${att.attachment_file}" target="_blank">${att.attachment_file}</a></li>`;
								});
								message += '</ul>';
								message += `<p>Total: ${attachments.length} attachment(s)</p>`;
								
								frappe.msgprint({
									title: __('Template Attachments'),
									message: message,
									indicator: 'blue'
								});
							}
						}
					});
				} else {
					frappe.msgprint(__('Please select an Email Template first'));
				}
			});
			
			// Add button to send test email
			frm.add_custom_button(__('Send Test Email'), function() {
				let d = new frappe.ui.Dialog({
					title: __('Send Test Email'),
					fields: [
						{
							label: __('Recipient Email'),
							fieldname: 'recipient',
							fieldtype: 'Data',
							reqd: 1,
							description: __('Enter the email address to send the test email')
						},
						{
							label: __('Context (JSON)'),
							fieldname: 'context_json',
							fieldtype: 'Code',
							options: 'JSON',
							description: __('Optional: Provide context variables as JSON')
						}
					],
					primary_action_label: __('Send'),
					primary_action(values) {
						frappe.call({
							method: 'crm_pp.api.email_template_attachment.send_template_email_with_attachment',
							args: {
								template_name: frm.doc.email_template,
								recipient: values.recipient,
								context_json: values.context_json || '{}'
							},
							callback: function(r) {
								if (r.message) {
									frappe.msgprint({
										title: __('Success'),
										message: r.message,
										indicator: 'green'
									});
									d.hide();
								}
							}
						});
					}
				});
				d.show();
			});
		}
		
		// Show help message
		if (frm.is_new()) {
			frm.dashboard.add_comment(__('Map PDF attachments to Email Templates. When emails are sent using the template, these files will be automatically attached.'), 'blue', true);
		}
	},
	
	email_template: function(frm) {
		// Validate the template when selected
		if (frm.doc.email_template) {
			frappe.call({
				method: 'crm_pp.api.email_template_attachment.validate_template_and_attachments',
				args: {
					template_name: frm.doc.email_template
				},
				callback: function(r) {
					if (r.message) {
						let result = r.message;
						if (result.template_exists) {
							if (result.attachment_count > 0) {
								frappe.show_alert({
									message: __(`This template already has ${result.attachment_count} attachment(s) configured`),
									indicator: 'blue'
								}, 5);
							}
						}
					}
				}
			});
		}
	},
	
	attachment_file: function(frm) {
		// Show preview when attachment is selected
		if (frm.doc.attachment_file) {
			let file_url = frm.doc.attachment_file;
			let file_name = file_url.split('/').pop();
			frappe.show_alert({
				message: __(`Selected file: ${file_name}`),
				indicator: 'green'
			}, 3);
		}
	}
});


