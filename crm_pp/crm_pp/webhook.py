import frappe

@frappe.whitelist(allow_guest=False)
def create_lead_from_chatbot():
    data = frappe.local.form_dict or {}

    # Support both formats: with user_data wrapper or direct fields
    user_data = data.get("user_data")
    if user_data:
        # Data is wrapped in user_data
        source_data = user_data
    else:
        # Data is sent directly
        source_data = data

    # Extract fields
    first_name = source_data.get("first_name")
    last_name = source_data.get("last_name")
    email = source_data.get("email")
    phone = source_data.get("phone")
    custom_message = source_data.get("notes")
    vertical = source_data.get("vertical")
    company = source_data.get("organisation_name")
    
    # Validate required fields
    if not first_name:
        frappe.throw("Missing required field: first_name")
    # Create Lead
    lead_name = f"{first_name} {last_name}" if last_name else first_name
    
    lead = frappe.get_doc({
        "doctype": "Lead",
        "lead_name": lead_name,
        "email_id": email,
        "phone": phone,
        "custom_description": custom_message,
        "source": "Smatbot_SEO",
        "lead_owner": "webuser@promptpersonnel.com",
        "custom_vertical": vertical,
        "company_name": company
    })
    lead.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "success", "lead_name": lead.name}
