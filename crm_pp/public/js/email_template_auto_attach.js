/**
 * Email Template Auto-Attach - Robust Version
 * 
 * Automatically attaches predefined PDF files when Email Templates are selected
 * in the standard Frappe Email Dialog.
 * 
 * @author CRM PP
 * @version 2.0
 */

frappe.provide("crm_pp.email");

// Track attached files to prevent duplicates
crm_pp.email.auto_attached_files = [];
crm_pp.email.hooks_installed = false;

/**
 * Main initialization - called when script loads
 */
crm_pp.email.init = function() {
	console.log("CRM PP: Initializing email template auto-attach...");
	
	// Method 1: Hook into frappe.views.CommunicationComposer
	crm_pp.email.hook_communication_composer();
	
	// Method 2: Listen for email dialog events
	crm_pp.email.setup_dialog_listeners();
	
	// Method 3: Override email button click
	crm_pp.email.hook_email_button();
	
	console.log("CRM PP: Email template auto-attach hook installed ✓");
};

/**
 * Method 1: Hook into CommunicationComposer class
 */
crm_pp.email.hook_communication_composer = function() {
	if (!frappe.views || !frappe.views.CommunicationComposer) {
		console.warn("CRM PP: CommunicationComposer not found, will try other methods");
		return;
	}
	
	// Store original setup method
	const original_setup = frappe.views.CommunicationComposer.prototype.setup;
	
	frappe.views.CommunicationComposer.prototype.setup = function() {
		// Call original
		const result = original_setup.apply(this, arguments);
		
		// Setup our handler after a small delay
		const composer = this;
		setTimeout(function() {
			crm_pp.email.setup_template_handler(composer);
		}, 200);
		
		return result;
	};
	
	console.log("CRM PP: Hooked into CommunicationComposer.setup");
};

/**
 * Method 2: Listen for dialog-related events
 */
crm_pp.email.setup_dialog_listeners = function() {
	// Listen for any frappe dialogs
	frappe.ui.on_dialog_show = frappe.ui.on_dialog_show || [];
	
	$(document).on('show.bs.modal', function(e) {
		// Check if this is an email dialog
		setTimeout(function() {
			const $modal = $(e.target);
			const $email_template = $modal.find('[data-fieldname="email_template"]');
			
			if ($email_template.length > 0) {
				console.log("CRM PP: Email dialog detected via modal event");
				crm_pp.email.setup_template_handler_by_selector($modal);
			}
		}, 300);
	});
	
	console.log("CRM PP: Dialog listeners installed");
};

/**
 * Method 3: Hook into email button clicks
 */
crm_pp.email.hook_email_button = function() {
	$(document).on('click', '[data-label="Email"], button:contains("Email")', function() {
		console.log("CRM PP: Email button clicked, waiting for dialog...");
		
		// Wait for dialog to open and setup handler
		setTimeout(function() {
			crm_pp.email.find_and_hook_dialog();
		}, 500);
	});
	
	console.log("CRM PP: Email button hook installed");
};

/**
 * Find currently open email dialog and hook into it
 */
crm_pp.email.find_and_hook_dialog = function() {
	// Try to find dialog by various methods
	
	// Method A: Find by cur_dialog
	if (window.cur_dialog && cur_dialog.fields_dict && cur_dialog.fields_dict.email_template) {
		console.log("CRM PP: Found dialog via cur_dialog");
		crm_pp.email.setup_template_handler_for_dialog(cur_dialog);
		return true;
	}
	
	// Method B: Find by selector
	const $modal = $('.modal.show .modal-dialog:has([data-fieldname="email_template"])').closest('.modal');
	if ($modal.length > 0) {
		console.log("CRM PP: Found dialog via selector");
		crm_pp.email.setup_template_handler_by_selector($modal);
		return true;
	}
	
	// Method C: Check all open frappe dialogs
	if (frappe.ui.open_dialogs && frappe.ui.open_dialogs.length > 0) {
		for (let i = 0; i < frappe.ui.open_dialogs.length; i++) {
			const dialog = frappe.ui.open_dialogs[i];
			if (dialog.fields_dict && dialog.fields_dict.email_template) {
				console.log("CRM PP: Found dialog via open_dialogs");
				crm_pp.email.setup_template_handler_for_dialog(dialog);
				return true;
			}
		}
	}
	
	console.warn("CRM PP: Could not find email dialog");
	return false;
};

/**
 * Setup template change handler for a composer object
 */
crm_pp.email.setup_template_handler = function(composer) {
	if (!composer || !composer.dialog) {
		return;
	}
	
	crm_pp.email.setup_template_handler_for_dialog(composer.dialog);
};

/**
 * Setup template change handler by jQuery selector
 */
crm_pp.email.setup_template_handler_by_selector = function($modal) {
	const $template_field = $modal.find('[data-fieldname="email_template"]');
	if ($template_field.length === 0) {
		return;
	}
	
	// Watch for changes on the select element
	$template_field.find('select, input').on('change', function() {
		const template_name = $(this).val();
		if (template_name) {
			console.log("CRM PP: Template selected:", template_name);
			crm_pp.email.fetch_and_attach(template_name, $modal);
		}
	});
	
	console.log("CRM PP: Template handler installed (via selector)");
};

/**
 * Setup template change handler for a dialog object
 */
crm_pp.email.setup_template_handler_for_dialog = function(dialog) {
	if (!dialog || !dialog.fields_dict || !dialog.fields_dict.email_template) {
		return;
	}
	
	const field = dialog.fields_dict.email_template;
	
	// Store original change handler
	const original_onchange = field.df.onchange;
	
	// Override onchange
	field.df.onchange = function() {
		// Call original handler
		if (original_onchange) {
			original_onchange.apply(this, arguments);
		}
		
		// Get selected template
		const template_name = field.get_value();
		if (template_name) {
			console.log("CRM PP: Template changed to:", template_name);
			// Small delay to let template content load
			setTimeout(function() {
				crm_pp.email.fetch_and_attach_for_dialog(template_name, dialog);
			}, 400);
		}
	};
	
	// Also watch the underlying input element
	if (field.$input) {
		field.$input.on('change', function() {
			const template_name = $(this).val();
			if (template_name) {
				console.log("CRM PP: Template changed via input:", template_name);
				setTimeout(function() {
					crm_pp.email.fetch_and_attach_for_dialog(template_name, dialog);
				}, 400);
			}
		});
	}
	
	console.log("CRM PP: Template handler installed (via dialog object)");
};

/**
 * Fetch attachments from API and attach to dialog (by selector)
 */
crm_pp.email.fetch_and_attach = function(template_name, $modal) {
	console.log("CRM PP: Fetching attachments for:", template_name);
	
	frappe.call({
		method: 'crm_pp.api.get_email_template_attachments.get_email_template_attachments',
		args: {
			template_name: template_name
		},
		callback: function(r) {
			if (r.message && r.message.length > 0) {
				console.log("CRM PP: Found", r.message.length, "attachment(s)");
				
				// Try to add attachments via various methods
				crm_pp.email.add_attachments_to_modal($modal, r.message);
				
				// Show notification
				frappe.show_alert({
					message: __('Added {0} attachment(s) from template', [r.message.length]),
					indicator: 'green'
				}, 5);
			} else {
				console.log("CRM PP: No attachments found for this template");
			}
		},
		error: function(err) {
			console.error("CRM PP: Error fetching attachments:", err);
		}
	});
};

/**
 * Fetch attachments and attach to dialog object
 */
crm_pp.email.fetch_and_attach_for_dialog = function(template_name, dialog) {
	console.log("CRM PP: Fetching attachments for:", template_name);
	
	// Reset tracking
	crm_pp.email.auto_attached_files = [];
	
	frappe.call({
		method: 'crm_pp.api.get_email_template_attachments.get_email_template_attachments',
		args: {
			template_name: template_name
		},
		callback: function(r) {
			if (r.message && r.message.length > 0) {
				console.log("CRM PP: Found", r.message.length, "attachment(s)");
				
				// Add each attachment
				r.message.forEach(function(file) {
					crm_pp.email.add_attachment_to_dialog(dialog, file);
				});
				
				// Show notification
				frappe.show_alert({
					message: __('Added {0} attachment(s) from template', [r.message.length]),
					indicator: 'green'
				}, 5);
			} else {
				console.log("CRM PP: No attachments found for this template");
			}
		},
		error: function(err) {
			console.error("CRM PP: Error fetching attachments:", err);
		}
	});
};

/**
 * Add attachments to modal (by selector)
 */
crm_pp.email.add_attachments_to_modal = function($modal, files) {
	// Find the attachments select field
	const $attach_select = $modal.find('[data-fieldname="select_attachments"] select');
	
	if ($attach_select.length > 0) {
		files.forEach(function(file) {
			// Add option if it doesn't exist
			if ($attach_select.find('option[value="' + file.file_url + '"]').length === 0) {
				const $option = $('<option>', {
					value: file.file_url,
					text: file.file_name,
					selected: true
				});
				$attach_select.append($option);
				console.log("CRM PP: Added attachment:", file.file_name);
			}
		});
		
		// Trigger change to update UI
		$attach_select.trigger('change');
	}
};

/**
 * Add single attachment to dialog object
 */
crm_pp.email.add_attachment_to_dialog = function(dialog, file) {
	if (!dialog) {
		return;
	}
	
	// Check if already added
	if (crm_pp.email.auto_attached_files.includes(file.name)) {
		console.log("CRM PP: Attachment already added, skipping:", file.file_name);
		return;
	}
	
	// Method A: Add to select_attachments field
	if (dialog.fields_dict && dialog.fields_dict.select_attachments) {
		const attach_field = dialog.fields_dict.select_attachments;
		
		// Get current value
		let current_value = attach_field.get_value() || [];
		if (typeof current_value === 'string') {
			current_value = current_value ? [current_value] : [];
		}
		
		// Add file URL if not present
		if (!current_value.includes(file.file_url)) {
			current_value.push(file.file_url);
			attach_field.set_value(current_value);
			console.log("CRM PP: Added attachment via field:", file.file_name);
		}
	}
	
	// Method B: Add to attachment list if exists
	if (dialog.attachments) {
		const exists = dialog.attachments.some(function(att) {
			return att.name === file.name || att.file_url === file.file_url;
		});
		
		if (!exists) {
			dialog.attachments.push({
				name: file.name,
				file_name: file.file_name,
				file_url: file.file_url,
				is_private: file.is_private
			});
			console.log("CRM PP: Added to dialog.attachments:", file.file_name);
		}
	}
	
	// Mark as added
	crm_pp.email.auto_attached_files.push(file.name);
};

/**
 * Initialize on page load
 */
$(document).ready(function() {
	// Wait a bit for Frappe to fully load
	setTimeout(function() {
		crm_pp.email.init();
	}, 1000);
});

/**
 * Also try to initialize when page changes (SPA behavior)
 */
frappe.router.on('change', function() {
	if (!crm_pp.email.hooks_installed) {
		crm_pp.email.init();
		crm_pp.email.hooks_installed = true;
	}
});

/**
 * Expose for debugging
 */
window.crm_pp_email = crm_pp.email;

console.log("CRM PP: Email template auto-attach script loaded");
