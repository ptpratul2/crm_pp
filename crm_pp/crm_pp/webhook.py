import frappe

@frappe.whitelist(allow_guest=False)
def create_lead_from_chatbot():
    data = frappe.local.form_dict or {}

    user_data = data.get("user_data")
    if not user_data:
        frappe.throw("Missing parameter: user_data")

    # Extract fields
    first_name = user_data.get("first_name")
    last_name = user_data.get("last_name")
    email = user_data.get("email")
    phone = user_data.get("phone")
    notes = user_data.get("notes")

    # Create Lead
    lead = frappe.get_doc({
        "doctype": "Lead",
        "lead_name": f"{first_name} {last_name}",
        "email_id": email,
        "phone": phone,
        "custom_description": notes,
        "source": "Smatbot_SEO",
        "lead_owner": "webuser@promptpersonnel.com"
    })
    lead.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "success", "lead_name": lead.name}
