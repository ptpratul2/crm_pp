import frappe
from frappe.utils import getdate

def execute(filters=None):
    columns = [
        {"label": "Lead Name", "fieldtype": "Data", "fieldname": "lead_name", "width": 150},
        {"label": "Creation", "fieldtype": "Date", "fieldname": "creation", "width": 120},
        {"label": "Converted Date", "fieldtype": "Date", "fieldname": "custom_convert_on", "width": 120},
        {"label": "TAT (Days)", "fieldtype": "Int", "fieldname": "tat", "width": 100},
        {"label": "Status", "fieldtype": "Data", "fieldname": "status", "width": 100},
        {"label": "Vertical", "fieldtype": "Data", "fieldname": "custom_vertical", "width": 100},
        {"label": "Sub Vertical", "fieldtype": "Data", "fieldname": "custom_sub_vertical", "width": 100},
       ]
    data = frappe.db.sql("""
        SELECT
            name as lead_name,
			status as status,
			custom_vertical as custom_vertical,
			custom_sub_vertical as custom_sub_vertical,
            creation,
            custom_convert_on,
            DATEDIFF(custom_convert_on, creation) as tat
        FROM tabLead
        WHERE custom_convert_on IS NOT NULL
    """, as_dict=True)

    return columns, data
