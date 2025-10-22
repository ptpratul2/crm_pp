import frappe
from frappe.utils import flt


@frappe.whitelist()
def get_conversion_rate():
	"""Calculate Lead to Opportunity conversion rate"""
	total_leads = frappe.db.count("Lead")
	total_opportunities = frappe.db.count("Opportunity")

	if total_leads == 0:
		return 0

	conversion_rate = (total_opportunities / total_leads) * 100
	return round(conversion_rate, 2)


@frappe.whitelist()
def get_collection_efficiency():
	"""Calculate collection efficiency (Payment Received / Total Sales) * 100"""
	total_sales = frappe.db.sql(
		"""
		SELECT SUM(grand_total)
		FROM `tabSales Invoice`
		WHERE docstatus = 1
	"""
	)[0][0] or 0

	payment_received = frappe.db.sql(
		"""
		SELECT SUM(paid_amount)
		FROM `tabPayment Entry`
		WHERE docstatus = 1 AND payment_type = 'Receive'
	"""
	)[0][0] or 0

	if total_sales == 0:
		return 0

	efficiency = (payment_received / total_sales) * 100
	return round(efficiency, 2)

