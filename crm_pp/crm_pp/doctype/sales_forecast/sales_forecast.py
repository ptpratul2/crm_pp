import frappe
from frappe.model.document import Document
from frappe.utils import today

class SalesForecast(Document):

    def validate(self):
        # self.validate_unique_forecast()
        self.calculate_monthly_target()
        self.validate_edit_rules()

    def before_submit(self):
        self.set_snapshot_date()

    # def validate_unique_forecast(self):
    #     """Avoid duplicate forecast per BD + Vertical + FY + Month"""
    #     exists = frappe.db.exists(
    #         "Sales Forecast",
    #         {
    #             "salesperson": self.salesperson,
    #             "vertical__business_unit": self.vertical__business_unit,
    #             "time_period": self.time_period,
    #             "forecast_revenue_next_month": self.forecast_revenue_next_month,
    #             "name": ("!=", self.name)
    #         }
    #     )
    #     if exists:
    #         frappe.throw(
    #             "Sales Forecast already exists for this BD, Vertical, Fiscal Year and Month."
    #         )

    def calculate_monthly_target(self):
        """Annual ÷ 12"""
        if self.annual_target_revenue:
            self.monthly_targetderived = self.annual_target_revenue / 12

    def set_snapshot_date(self):
        """Freeze belief date"""
        if not self.snapshot_date:
            self.snapshot_date = today()

    def validate_edit_rules(self):
        """Prevent editing past snapshots & annual targets"""
        if not self.is_new():
            old_doc = frappe.get_doc(self.doctype, self.name)

            # Snapshot locked → no edits allowed
            if old_doc.snapshot_date:
                blocked_fields = [
                    "forecast_revenue",
                    "annual_target_revenue"
                ]
                for field in blocked_fields:
                    if old_doc.get(field) != self.get(field):
                        frappe.throw(
                            "Past forecasts / annual targets cannot be edited after snapshot."
                        )
