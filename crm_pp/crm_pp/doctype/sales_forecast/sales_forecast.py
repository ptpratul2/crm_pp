

import frappe
from frappe.model.document import Document
from frappe.utils import today

class SalesForecast(Document):

    def validate(self):
        self.calculate_monthly_target()
        self.validate_edit_rules()

    def before_submit(self):
        self.set_snapshot_date()

    def calculate_monthly_target(self):
        """Annual Target ÷ 12"""
        if self.annual_target_revenue:
            self.monthly_targetderived = self.annual_target_revenue / 12

    def set_snapshot_date(self):
        """Freeze snapshot date"""
        if not self.snapshot_date:
            self.snapshot_date = today()

    def validate_edit_rules(self):
        """Prevent editing past snapshots"""
        if not self.is_new():
            old_doc = frappe.get_doc(self.doctype, self.name)

            if old_doc.snapshot_date:
                blocked_fields = [
                    "forecast_revenue_next_month",
                    "annual_target_revenue"
                ]

                for field in blocked_fields:
                    if old_doc.get(field) != self.get(field):
                        frappe.throw(
                            "Past forecasts / annual targets cannot be edited after snapshot."
                        )
