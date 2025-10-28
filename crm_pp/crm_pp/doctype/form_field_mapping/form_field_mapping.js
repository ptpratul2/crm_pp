// Copyright (c) 2025, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Form Field Mapping', {
	refresh: function(frm) {
		// Add custom button to test mapping
		if (!frm.is_new()) {
			frm.add_custom_button(__('Test Mapping'), function() {
				test_field_mapping(frm);
			});
		}
	},
	
	transformation_type: function(frm) {
		// Show/hide transformation rule field
		frm.toggle_display('transformation_rule', frm.doc.transformation_type === 'Custom');
	}
});

function test_field_mapping(frm) {
	frappe.prompt([
		{
			'fieldname': 'test_value',
			'fieldtype': 'Data',
			'label': 'Test Value',
			'reqd': 1
		}
	],
	function(values) {
		frappe.call({
			method: 'crm_pp.crm_pp.doctype.form_field_mapping.form_field_mapping.test_transformation',
			args: {
				mapping_name: frm.doc.name,
				test_value: values.test_value
			},
			callback: function(r) {
				if (r.message) {
					frappe.msgprint({
						title: __('Transformation Result'),
						indicator: 'green',
						message: __(`Input: <b>${values.test_value}</b><br>Output: <b>${r.message}</b>`)
					});
				}
			}
		});
	},
	__('Test Field Transformation'),
	__('Test')
	);
}

