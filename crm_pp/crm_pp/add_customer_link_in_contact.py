import frappe
from crm_pp.crm_pp.create_customer_from_lead import add_customer_link_in_contact

def execute():

    customers = frappe.get_all(
        "Customer",
        filters={
            "lead_name": ["is", "set"]
        },
        fields=["name", "lead_name"]
    )


    for customer in customers:
        print(
            f"➡ Processing Customer: {customer.name}, "
            f"Lead: {customer.lead_name}"
        )

        add_customer_link_in_contact(
            lead_name=customer.lead_name,
            customer_name=customer.name
        )

    print("✅ Patch completed successfully====")
