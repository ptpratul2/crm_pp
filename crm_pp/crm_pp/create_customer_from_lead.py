import frappe
from erpnext.crm.doctype.lead.lead import _make_customer

@frappe.whitelist()
def create_customer_from_lead(doc, method=None):
    if doc.status in ["Converted", "Convert"]:
        try:
            existing_customer = frappe.db.exists("Customer", {"lead_name": doc.name})
            if existing_customer:
                return

            customer_doc = _make_customer(source_name=doc.name)

            if hasattr(customer_doc, "customer_type"):
                if customer_doc.customer_type.strip() == "Company":
                    customer_doc.customer_type = "Business Owner "

            # Insert without running validations
            customer_doc.flags.ignore_validate = True
            customer_doc.flags.ignore_mandatory = True
            customer_doc.insert(ignore_permissions=True)

            frappe.db.commit()
            frappe.logger().info(f" Customer auto-created for Lead: {doc.name}")

        except Exception as e:
            frappe.log_error(
                f"Error auto-creating Customer from Lead {doc.name}: {str(e)}",
                "Lead to Customer Auto Creation Error"
            )




def add_customer_link_in_contact(lead_name, customer_name):
    """
    Lead se bane Contact ke 'Links' child table me
    Customer ka ek extra row add karega
    """

    # Lead se linked contacts nikalna
    contact_names = frappe.get_all(
        "Dynamic Link",
        filters={
            "link_doctype": "Lead",
            "link_name": lead_name
        },
        pluck="parent"
    )


    for contact_name in set(contact_names):

        contact = frappe.get_doc("Contact", contact_name)

        # Agar Customer link pehle se hai, skip
        already_linked = any(
            link.link_doctype == "Customer" and link.link_name == customer_name
            for link in contact.links
        )

        if already_linked:
            print(f"⏭ Customer {customer_name} already linked with Contact {contact_name}")
            continue

        # New row add karna
        contact.append("links", {
            "link_doctype": "Customer",
            "link_name": customer_name,
            "link_title": customer_name
        })


        contact.flags.ignore_permissions = True
        contact.save()

    frappe.db.commit()


# 3️ CUSTOMER AFTER INSERT HOOK WRAPPER

def add_customer_link_in_contact_wrapper(doc, method):
    """
    Customer create hone ke baad call hoga
    """

    if doc.lead_name:
        add_customer_link_in_contact(
            lead_name=doc.lead_name,
            customer_name=doc.name
        )
    
