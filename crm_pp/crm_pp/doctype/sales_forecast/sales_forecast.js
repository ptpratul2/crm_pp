// // Copyright (c) 2025, Octavision Software Solutions and contributors
// // For license information, please see license.txt

// frappe.ui.form.on("Sales Forecast", {
	// refresh(frm) {
		// frm.add_custom_button(__('Refresh Opportunities'), () => {
		// 	frappe.call({
		// 		method: 'crm_pp.crm_pp.doctype.sales_forecast.sales_forecast.SalesForecast.populate_opportunities',
		// 		doc: frm.doc,
		// 		callback: function(r) {
		// 			if (!r.exc) {
		// 				frappe.msgprint(__(`${r.message} opportunities added/updated`));
		// 				frm.reload_doc();
		// 			}
		// 		}
		// 	});
		// },
        //  __('Actions'));
	// },

// 	start_date(frm) { frm.trigger('client_recalc'); },
// 	end_date(frm) { frm.trigger('client_recalc'); },
// 	annual_target(frm) { frm.trigger('client_recalc'); },
// 	forecast_amount(frm) { frm.trigger('calc_variance'); },

// 	client_recalc(frm) {
// 		let annual = flt(frm.doc.annual_target || 0);
// 		if (annual && frm.doc.start_date && frm.doc.end_date) {
// 			let sd = frappe.datetime.str_to_obj(frm.doc.start_date);
// 			let ed = frappe.datetime.str_to_obj(frm.doc.end_date);
// 			let months = ((ed.getFullYear() - sd.getFullYear()) * 12) + (ed.getMonth() - sd.getMonth()) + 1;
// 			frm.set_value('target_for_selected_range', months > 0 ? (annual/12.0) * months : 0);
// 		} else {
// 			frm.set_value('target_for_selected_range', 0);
// 		}
// 		frm.refresh_field('target_for_selected_range');

// 		// call server to pull actuals/outstanding
// 		frappe.call({
// 			method: 'crm_pp.crm_pp.doctype.sales_forecast.sales_forecast.SalesForecast.pull_actuals_and_outstanding',
// 			doc: frm.doc,
// 			callback: function(r) {
// 				// server method runs before_save logic; reload after server updates
// 				if (!r.exc) {
// 					frm.reload_doc();
// 					frm.trigger('calc_variance');
// 				}
// 			}
// 		});
// 	},

// 	calc_variance(frm) {
// 		let forecast = flt(frm.doc.forecast_amount || 0);
// 		let actual = flt(frm.doc.actual_revenue || 0);
// 		frm.set_value('forecast_variance', forecast - actual);
// 		frm.set_value('variance_percent', forecast ? ((forecast - actual) / forecast) * 100.0 : 0);
// 		frm.refresh_field(['forecast_variance','variance_percent']);
// 	}
// });

// // child table triggers
// frappe.ui.form.on("Opportunities Nearing Closure", {
// 	value(frm, cdt, cdn) { frm.trigger('calc_variance'); },
// 	stage(frm, cdt, cdn) {
// 		let row = locals[cdt][cdn];
// 		if (row.stage && row.stage.toLowerCase().includes('closed')) {
// 			frappe.show_alert({message: __('Opportunity {0} closed', [row.opportunity_name]), indicator:'green'});
// 		}
// 	}
// });



// Copyright (c) 2025, Octavision Software Solutions
// For license information, please see license.txt

frappe.ui.form.on("Sales Forecast", {
	refresh(frm) {
		// --- Custom Button to Refresh Opportunities ---
		frm.add_custom_button(__('Refresh Opportunities'), () => {
            // frappe.msgprint("this is custom button===========================")
			frappe.call({
				method: 'crm_pp.crm_pp.custom_sales_forecast.populate_opportunities',
                args: { doc: frm.doc.name },
				callback: function (r) {
					if (!r.exc) {
						frappe.msgprint(__(`${r.message} opportunities added/updated`));
						frm.reload_doc();
					}
				}
			});
		}, __('Actions'));

		frm.trigger("calc_target_for_range");
		frm.trigger("calc_variance");
		frm.trigger("calc_total_forecast_value");
	},

	start_date(frm) {
		frm.trigger("calc_target_for_range");
	},

	end_date(frm) {
		frm.trigger("calc_target_for_range");
	},

	forecast_amount(frm) {
		frm.trigger("calc_variance");
	},

	actual_revenue(frm) {
		frm.trigger("calc_variance");
	},

	// --- Function to Calculate Target for Selected Range ---
	calc_target_for_range(frm) {
		let annual = flt(frm.doc.annual_target);
		if (annual && frm.doc.start_date && frm.doc.end_date) {
			let d1 = new Date(frm.doc.start_date);
			let d2 = new Date(frm.doc.end_date);
			let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
			let target_range = (annual / 12.0) * months;
			frm.set_value("target_for_selected_range", target_range);
		} else {
			frm.set_value("target_for_selected_range", 0);
		}
	},

	calc_variance(frm) {
		let forecast = flt(frm.doc.forecast_amount);
		let actual = flt(frm.doc.actual_revenue);
		let variance = forecast - actual;
		let percent = forecast ? (variance / forecast) * 100 : 0;
		frm.set_value("forecast_variance", variance);
		frm.set_value("variance_", percent);
	},

	// --- Function to Calculate Total Forecast from Child Table ---
	calc_total_forecast_value(frm) {
		let total = 0.0;
		(frm.doc.opportunities_nearing_closure || []).forEach(row => {
			total += flt(row.value);
		});
		frm.set_value("forecast_amount", total);
	}
});
