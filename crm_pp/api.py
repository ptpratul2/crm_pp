import frappe

@frappe.whitelist(allow_guest=True)
def create_web_lead():
    form_data = frappe.form_dict

    try:
        new_lead = frappe.new_doc("Lead")
        
        new_lead.lead_name = form_data.get('full_name')
        new_lead.company_name = form_data.get('company')
        new_lead.mobile_no = form_data.get('phone')
        new_lead.email_id = form_data.get('email')
        new_lead.city = form_data.get('city')
        
        if frappe.db.has_column("Lead", "custom_vertical"):
             new_lead.custom_vertical = form_data.get('services')
        
        if frappe.db.has_column("Lead", "custom_message"):
             new_lead.custom_message = form_data.get('message')
        
        new_lead.insert(ignore_permissions=True)
        
        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = form_data.get('retURL')
        frappe.local.response.status_code = 303

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Web Lead Creation Failed")
        frappe.respond_as_web_page(
            "Error",
            "Sorry, there was an error submitting your request. Please try again.",
            http_status_code=500
        )