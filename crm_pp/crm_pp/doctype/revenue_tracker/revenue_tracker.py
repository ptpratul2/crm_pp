# Copyright (c) 2025, Octavision Software Solutions and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
from frappe.utils import flt, cint

class RevenueTracker(Document):
	"""
	Assumed fieldnames (use exact same names in Doctype):
	- salesperson (Link)
	- vertical (Select)
	- region (Select)
	- client (Link)
	- invoice_number (Data)
	- invoice_date (Date)
	- invoice_amount (Currency)           -> Currency field
	- payment_received (Currency)         -> Currency field
	- payment_receipt_date (Date)
	- outstanding (Currency / Float)      -> Currency recommended (auto)
	- payment_status (Select)             -> Paid / Partial / Unpaid
	- annual_target (Currency)            -> Currency
	- monthly_target (Currency)           -> Currency (auto)
	- quarterly_target (Currency)         -> Currency (auto)
	- target_for_selected_range (Currency)-> Currency (auto)
	- revenue_received (Currency)         -> Currency (auto/aggregate)
	- achievement_percent (Float)         -> Float (percentage)
	- remarks (Small Text)
	"""

	def validate(self):
		self.invoice_amount = flt(self.invoice_amount)
		self.payment_received = flt(self.payment_received)
		self.annual_target = flt(self.annual_target)

		# calculations
		self.calculate_outstanding()
		self.calculate_targets()
		self.calculate_achievement_percent()

	def before_save(self):
		# Recalculate before save to ensure integrity
		self.calculate_outstanding()
		self.calculate_targets()
		self.calculate_achievement_percent()

	def calculate_outstanding(self):
		self.outstanding = flt(self.invoice_amount) - flt(self.payment_received)

	def calculate_targets(self):
		if flt(self.annual_target):
			self.monthly_target = flt(self.annual_target) / 12.0
			self.quarterly_target = flt(self.annual_target) / 4.0
		else:
			self.monthly_target = 0.0
			self.quarterly_target = 0.0

	def calculate_achievement_percent(self):
		r = flt(self.revenue_received)
		t = flt(self.target_for_selected_range)
		if t:
			self.achievement_percent = (r / t) * 100.0
		else:
			self.achievement_percent = 0.0

	# @frappe.whitelist()
	# def compute_aggregates(self, start_date=None, end_date=None, salesperson=None, vertical=None):
	# 	conditions = []
	# 	values = []

	# 	if salesperson:
	# 		conditions.append("salesperson = %s"); values.append(salesperson)
	# 	if vertical:
	# 		conditions.append("vertical = %s"); values.append(vertical)
	# 	if start_date and end_date:
	# 		conditions.append("invoice_date BETWEEN %s AND %s"); values.extend([start_date, end_date])

	# 	where_clause = (" WHERE " + " AND ".join(conditions)) if conditions else ""

	# 	query = f"""
	# 		SELECT
	# 			COALESCE(SUM(invoice_amount),0) AS total_invoice,
	# 			COALESCE(SUM(payment_received),0) AS total_received,
	# 			COALESCE(SUM(invoice_amount) - SUM(payment_received),0) AS total_outstanding
	# 		FROM `tabRevenue Tracker`
	# 		{where_clause}
	# 	"""

	# 	res = frappe.db.sql(query, values, as_dict=True)
	# 	if res:
	# 		row = res[0]
	# 		return {
	# 			"total_invoice_amount": flt(row.total_invoice),
	# 			"total_payment_received": flt(row.total_received),
	# 			"total_outstanding": flt(row.total_outstanding),
	# 		}
	# 	return {"total_invoice_amount": 0.0, "total_payment_received": 0.0, "total_outstanding": 0.0}
