// Form Integration Settings Page
frappe.pages['form-integration-settings'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Form Integration Settings',
		single_column: true
	});

	new FormIntegrationSettings(page);
};

class FormIntegrationSettings {
	constructor(page) {
		this.page = page;
		this.make();
	}

	make() {
		this.body = $(`<div class="form-integration-body"></div>`).appendTo(this.page.main);
		this.setup_toolbar();
		this.load_data();
	}

	setup_toolbar() {
		// Add New Mapping button
		this.page.add_inner_button(__('New Mapping'), () => {
			frappe.new_doc('Form Field Mapping');
		});

		// Test Webhook button
		this.page.add_inner_button(__('Test Webhook'), () => {
			this.show_test_dialog();
		});

		// View Logs button
		this.page.add_inner_button(__('View Logs'), () => {
			frappe.set_route('List', 'Webhook Log');
		});

		// Refresh button
		this.page.add_inner_button(__('Refresh'), () => {
			this.load_data();
		});
	}

	load_data() {
		// Show loading
		this.body.html('<div class="text-center" style="padding: 50px;"><i class="fa fa-spinner fa-spin fa-3x"></i><p class="text-muted mt-3">Loading...</p></div>');

		// Load mappings
		frappe.call({
			method: 'crm_pp.api.webhook.get_mappings',
			callback: (r) => {
				if (r.message) {
					this.render_page(r.message);
				}
			}
		});
	}

	render_page(mappings) {
		// Group mappings by form identifier
		let grouped = {};
		mappings.forEach(m => {
			if (!grouped[m.form_identifier]) {
				grouped[m.form_identifier] = [];
			}
			grouped[m.form_identifier].push(m);
		});

		let html = `
			<div class="row mb-4">
				<div class="col-md-12">
					<div class="card">
						<div class="card-header">
							<h5>📝 Webhook Endpoint</h5>
						</div>
						<div class="card-body">
							<p class="text-muted">Use this endpoint to receive form submissions:</p>
							<div class="input-group">
								<input type="text" class="form-control" id="webhook-url" 
								       value="https://crm.promptpersonnel.com/api/method/crm_pp.api.webhook.handle_lead_webhook" 
								       readonly>
								<div class="input-group-append">
									<button class="btn btn-primary" onclick="copyWebhookUrl()">
										<i class="fa fa-copy"></i> Copy
									</button>
								</div>
							</div>
							<small class="text-muted mt-2 d-block">
								Accepts POST requests with application/json or application/x-www-form-urlencoded
							</small>
						</div>
					</div>
				</div>
			</div>

			<div class="row mb-4">
				<div class="col-md-12">
					<div class="card">
						<div class="card-header">
							<h5>🔗 Form Mappings (${Object.keys(grouped).length} forms configured)</h5>
						</div>
						<div class="card-body">
		`;

		if (Object.keys(grouped).length === 0) {
			html += `
				<div class="text-center text-muted" style="padding: 30px;">
					<i class="fa fa-inbox fa-3x mb-3"></i>
					<p>No field mappings configured yet.</p>
					<button class="btn btn-primary btn-sm" onclick="frappe.new_doc('Form Field Mapping')">
						Create First Mapping
					</button>
				</div>
			`;
		} else {
			Object.keys(grouped).forEach(form_id => {
				html += this.render_form_section(form_id, grouped[form_id]);
			});
		}

		html += `
						</div>
					</div>
				</div>
			</div>

			<div class="row">
				<div class="col-md-12">
					<div class="card">
						<div class="card-header">
							<h5>📊 Recent Webhook Activity</h5>
						</div>
						<div class="card-body">
							<div id="recent-logs-container">
								<div class="text-center"><i class="fa fa-spinner fa-spin"></i> Loading...</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		this.body.html(html);
		this.load_recent_logs();
	}

	render_form_section(form_id, mappings) {
		return `
			<div class="form-section mb-4">
				<div class="d-flex justify-content-between align-items-center mb-2">
					<h6 class="mb-0">
						<span class="badge badge-info">${form_id}</span>
						<small class="text-muted ml-2">${mappings.length} fields mapped</small>
					</h6>
					<div>
						<button class="btn btn-sm btn-default" onclick="viewFormExample('${form_id}')">
							<i class="fa fa-code"></i> View Example
						</button>
					</div>
				</div>
				<table class="table table-sm table-bordered">
					<thead>
						<tr>
							<th>Source Field</th>
							<th>→</th>
							<th>Target Field</th>
							<th>Required</th>
							<th>Default</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						${mappings.map(m => `
							<tr>
								<td><code>${m.source_field}</code></td>
								<td class="text-center"><i class="fa fa-arrow-right"></i></td>
								<td><strong>${m.target_field}</strong></td>
								<td>${m.is_required ? '<span class="text-danger">*</span>' : ''}</td>
								<td>${m.default_value || '-'}</td>
								<td>
									<button class="btn btn-xs btn-default" onclick="editMapping('${m.name}')">
										<i class="fa fa-edit"></i>
									</button>
								</td>
							</tr>
						`).join('')}
					</tbody>
				</table>
			</div>
		`;
	}

	load_recent_logs() {
		frappe.call({
			method: 'frappe.client.get_list',
			args: {
				doctype: 'Webhook Log',
				fields: ['name', 'timestamp', 'form_identifier', 'status', 'lead_name', 'lead_id'],
				order_by: 'timestamp desc',
				limit: 10
			},
			callback: (r) => {
				if (r.message) {
					this.render_logs(r.message);
				}
			}
		});
	}

	render_logs(logs) {
		let html = '';
		
		if (logs.length === 0) {
			html = '<div class="text-center text-muted">No webhook logs yet</div>';
		} else {
			html = `
				<table class="table table-sm">
					<thead>
						<tr>
							<th>Timestamp</th>
							<th>Form</th>
							<th>Status</th>
							<th>Lead</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						${logs.map(log => `
							<tr>
								<td>${frappe.datetime.str_to_user(log.timestamp)}</td>
								<td><span class="badge badge-light">${log.form_identifier}</span></td>
								<td>
									<span class="badge badge-${log.status === 'Success' ? 'success' : 'danger'}">
										${log.status}
									</span>
								</td>
								<td>
									${log.lead_name ? 
										`<a href="/app/lead/${log.lead_id}">${log.lead_name}</a>` : 
										'-'
									}
								</td>
								<td>
									<button class="btn btn-xs btn-default" onclick="viewLog('${log.name}')">
										<i class="fa fa-eye"></i>
									</button>
								</td>
							</tr>
						`).join('')}
					</tbody>
				</table>
				<div class="text-center mt-3">
					<a href="/app/webhook-log" class="btn btn-sm btn-default">View All Logs</a>
				</div>
			`;
		}

		$('#recent-logs-container').html(html);
	}

	show_test_dialog() {
		let d = new frappe.ui.Dialog({
			title: __('Test Webhook'),
			fields: [
				{
					fieldname: 'form_identifier',
					fieldtype: 'Data',
					label: 'Form Identifier',
					reqd: 1
				},
				{
					fieldname: 'payload',
					fieldtype: 'Code',
					label: 'Test Payload (JSON)',
					reqd: 1,
					options: 'JSON',
					default: JSON.stringify({
						"form_identifier": "corporate_training",
						"email": "test@example.com",
						"first_name": "John",
						"last_name": "Doe",
						"company": "Test Company",
						"phone": "1234567890"
					}, null, 2)
				}
			],
			primary_action_label: __('Test'),
			primary_action: (values) => {
				frappe.call({
					method: 'crm_pp.api.webhook.handle_lead_webhook',
					args: {},
					type: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					data: values.payload,
					callback: (r) => {
						if (r.message && r.message.status === 'success') {
							frappe.show_alert({
								message: __('Test successful! Lead created: ' + r.message.lead_name),
								indicator: 'green'
							}, 5);
							d.hide();
						} else {
							frappe.msgprint({
								title: __('Test Failed'),
								indicator: 'red',
								message: r.message.message || 'Unknown error'
							});
						}
					}
				});
			}
		});

		d.show();
	}
}

// Global helper functions
window.copyWebhookUrl = function() {
	let url = document.getElementById('webhook-url').value;
	navigator.clipboard.writeText(url);
	frappe.show_alert({
		message: __('Webhook URL copied to clipboard'),
		indicator: 'green'
	}, 3);
};

window.editMapping = function(name) {
	frappe.set_route('Form', 'Form Field Mapping', name);
};

window.viewLog = function(name) {
	frappe.set_route('Form', 'Webhook Log', name);
};

window.viewFormExample = function(form_id) {
	frappe.call({
		method: 'crm_pp.api.webhook.get_mappings',
		args: { form_identifier: form_id },
		callback: (r) => {
			if (r.message) {
				show_form_example_dialog(form_id, r.message);
			}
		}
	});
};

function show_form_example_dialog(form_id, mappings) {
	let html_example = generate_html_form(form_id, mappings);
	let js_example = generate_js_example(form_id, mappings);

	let d = new frappe.ui.Dialog({
		title: __('Form Example: ') + form_id,
		size: 'large',
		fields: [
			{
				fieldname: 'html_code',
				fieldtype: 'Code',
				label: 'HTML Form',
				options: 'HTML',
				default: html_example
			},
			{
				fieldname: 'js_code',
				fieldtype: 'Code',
				label: 'JavaScript Example',
				options: 'JavaScript',
				default: js_example
			}
		]
	});

	d.show();
}

function generate_html_form(form_id, mappings) {
	let fields = mappings.map(m => {
		return `  <input type="${m.target_field === 'email_id' ? 'email' : 'text'}" 
         name="${m.source_field}" 
         placeholder="${m.target_field}" 
         ${m.is_required ? 'required' : ''}>`;
	}).join('\n');

	return `<form id="lead-form" method="POST" action="https://crm.promptpersonnel.com/api/method/crm_pp.api.webhook.handle_lead_webhook">
  <!-- Hidden identifier -->
  <input type="hidden" name="form_identifier" value="${form_id}">
  
  <!-- Form fields -->
${fields}
  
  <button type="submit">Submit</button>
</form>`;
}

function generate_js_example(form_id, mappings) {
	let sampleData = {};
	sampleData.form_identifier = form_id;
	mappings.forEach(m => {
		sampleData[m.source_field] = `sample_${m.source_field}`;
	});

	return `// Using fetch API
fetch('https://crm.promptpersonnel.com/api/method/crm_pp.api.webhook.handle_lead_webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${JSON.stringify(sampleData, null, 2)})
})
.then(response => response.json())
.then(data => {
  if (data.status === 'success') {
    console.log('Lead created:', data.lead_id);
  } else {
    console.error('Error:', data.message);
  }
})
.catch(error => console.error('Error:', error));`;
}

