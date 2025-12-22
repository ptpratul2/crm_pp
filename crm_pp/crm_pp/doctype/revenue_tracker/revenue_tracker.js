// Copyright (c) 2025, Octavision Software Solutions and contributors
// For license information, please see license.txt

frappe.ui.form.on("Revenue Tracker", {
	refresh(frm) {
		// frm.add_custom_button(__('Refresh KPIs (30d)'), () => frm.trigger('fetch_kpis'), __('Actions'));
	},

	invoice_amount(frm) {
		frm.set_value('invoice_amount', flt(frm.doc.invoice_amount || 0));
		frm.trigger('recalc_outstanding');
	},

	payment_received(frm) {
		frm.set_value('payment_received', flt(frm.doc.payment_received || 0));
		frm.trigger('recalc_outstanding');
	},

	annual_target(frm) {
		frm.trigger('recalc_targets');
	},

	recalc_outstanding(frm) {
		let invoice = flt(frm.doc.invoice_amount || 0);
		let payment = flt(frm.doc.payment_received || 0);
		let outstanding = invoice - payment;
		frm.set_value('outstanding', outstanding);
		if (payment >= invoice && invoice > 0) {
			frm.set_value('payment_status', 'Paid');
		} else if (payment > 0 && payment < invoice) {
			frm.set_value('payment_status', 'Partial');
		} else {
			frm.set_value('payment_status', 'Unpaid');
		}
		frm.refresh_field(['outstanding','payment_status']);
	},

	recalc_targets(frm) {
		let annual = flt(frm.doc.annual_target || 0);
		frm.set_value('monthly_target', annual ? (annual / 12.0) : 0);
		frm.set_value('quarterly_target', annual ? (annual / 4.0) : 0);
		frm.refresh_field(['monthly_target','quarterly_target']);
	},

	fetch_kpis(frm) {
		let end_date = frappe.datetime.get_today();
		let start_date = frappe.datetime.add_days(end_date, -30);

		frappe.call({
			method: 'crm_pp.crm_pp.doctype.revenue_tracker.revenue_tracker.RevenueTracker.compute_aggregates',
			args: {
				start_date: start_date,
				end_date: end_date,
				salesperson: frm.doc.salesperson || undefined,
				vertical: frm.doc.vertical || undefined
			},
			callback: function(r) {
				if (r.message) {
					frappe.msgprint(__('Last 30 days — Invoice: {0}, Collected: {1}, Outstanding: {2}',
						[
							frappe.utils.format_currency(r.message.total_invoice_amount),
							frappe.utils.format_currency(r.message.total_payment_received),
							frappe.utils.format_currency(r.message.total_outstanding)
						]));
				}
			}
		});
	}
});
