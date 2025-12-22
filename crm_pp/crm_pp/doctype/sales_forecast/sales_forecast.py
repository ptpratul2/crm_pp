# # Copyright (c) 2025, Octavision Software Solutions and contributors
# # For license information, please see license.txt
# import frappe
# from frappe.model.document import Document
# from frappe.utils import flt
# from datetime import datetime

# class SalesForecast(Document):
#     pass
# 	def before_save(self):
# 		self.calc_target_for_range()
# 		self.pull_actuals_and_outstanding()
# 		self.calc_variance()
# 		self.calc_total_forecast_value()

# 	def calc_target_for_range(self):
# 		annual = flt(self.annual_target)
# 		if annual and self.start_date and self.end_date:
# 			d1 = datetime.strptime(self.start_date, "%Y-%m-%d")
# 			d2 = datetime.strptime(self.end_date, "%Y-%m-%d")
# 			months = (d2.year - d1.year) * 12 + (d2.month - d1.month) + 1
# 			self.target_for_selected_range = (annual / 12.0) * months
# 		else:
# 			self.target_for_selected_range = 0.0

# 	def pull_actuals_and_outstanding(self):
# 		conditions = []
# 		values = []
# 		if self.salesperson:
# 			conditions.append("salesperson = %s"); values.append(self.salesperson)
# 		if self.vertical__business_unit:
# 			conditions.append("vertical__business_unit = %s"); values.append(self.vertical__business_unit)
# 		if self.start_date and self.end_date:
# 			conditions.append("invoice_date BETWEEN %s AND %s"); values.extend([self.start_date, self.end_date])

# 		where_clause = (" WHERE " + " AND ".join(conditions)) if conditions else ""
# 		query = f"""
# 			SELECT
# 				COALESCE(SUM(payment_received),0) AS total_received,
# 				COALESCE(SUM(invoice_amount) - SUM(payment_received),0) AS total_outstanding
# 			FROM `tabRevenue Tracker`
# 			{where_clause}
# 		"""
# 		res = frappe.db.sql(query, values, as_dict=True)
# 		if res:
# 			row = res[0]
# 			self.actual_revenue = flt(row.get('total_received', 0.0))
# 			self.outstanding = flt(row.get('total_outstanding', 0.0))
# 		else:
# 			self.actual_revenue = 0.0
# 			self.outstanding = 0.0

# 	def calc_variance(self):
# 		self.forecast_variance = flt(self.forecast_amount) - flt(self.actual_revenue)
# 		if flt(self.forecast_amount):
# 			self.variance_percent = (self.forecast_variance / flt(self.forecast_amount)) * 100.0
# 		else:
# 			self.variance_percent = 0.0

# 	def calc_total_forecast_value(self):
# 		total = 0.0
# 		for row in (self.opportunities_nearing_closure or []):
# 			total += flt(row.value)
# 		self.total_forecast_value = total




# Copyright (c) 2025, Octavision Software Solutions and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
from frappe.utils import flt, get_datetime

class SalesForecast(Document):

	def before_save(self):
		self.calc_target_for_range()
		self.pull_actuals_and_outstanding()
		self.calc_variance()
		self.calc_total_forecast_value()

	def calc_target_for_range(self):
		annual = flt(self.annual_target)
		if annual and self.start_date and self.end_date:
			# ✅ get_datetime() safely handles both str and date objects
			d1 = get_datetime(self.start_date)
			d2 = get_datetime(self.end_date)
			months = (d2.year - d1.year) * 12 + (d2.month - d1.month) + 1
			self.target_for_selected_range = (annual / 12.0) * months
		else:
			self.target_for_selected_range = 0.0

	def pull_actuals_and_outstanding(self):
		conditions = []
		values = []
		if self.salesperson:
			conditions.append("salesperson = %s"); values.append(self.salesperson)
		if self.vertical__business_unit:
			conditions.append("vertical__business_unit = %s"); values.append(self.vertical__business_unit)
		if self.start_date and self.end_date:
			conditions.append("invoice_date BETWEEN %s AND %s"); values.extend([self.start_date, self.end_date])

		where_clause = (" WHERE " + " AND ".join(conditions)) if conditions else ""
		query = f"""
			SELECT
				COALESCE(SUM(payment_received),0) AS total_received,
				COALESCE(SUM(invoice_amount) - SUM(payment_received),0) AS total_outstanding
			FROM `tabRevenue Tracker`
			{where_clause}
		"""
		res = frappe.db.sql(query, values, as_dict=True)
		if res:
			row = res[0]
			self.actual_revenue = flt(row.get('total_received', 0.0))
			self.outstanding = flt(row.get('total_outstanding', 0.0))
		else:
			self.actual_revenue = 0.0
			self.outstanding = 0.0

	def calc_variance(self):
		self.forecast_variance = flt(self.forecast_amount) - flt(self.actual_revenue)
		if flt(self.forecast_amount):
			self.variance_percent = (self.forecast_variance / flt(self.forecast_amount)) * 100.0
		else:
			self.variance_percent = 0.0

	def calc_total_forecast_value(self):
		total = 0.0
		for row in (self.opportunities_nearing_closure or []):
			total += flt(row.value)
		self.total_forecast_value = total
