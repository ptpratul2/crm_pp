

import frappe
from frappe.utils import flt

@frappe.whitelist()
def populate_opportunities(doc):
    print("doc============================", doc)

    if isinstance(doc, str):
        doc = frappe.get_doc("Sales Forecast", doc)

    filters = { "status": ["in", ["Agreement", "Negotiation"]]
}
    print(f"Filters used: {filters}")

    opps = frappe.get_all(
        "Opportunity",
        fields=[
            "name as opportunity",
            "party_name",
            "custom_close_date",
            "custom_actual_revenue",
            "status as stage",
            "owner as opportunity_owner"
        ],
        filters=filters,
        order_by="custom_actual_revenue desc",
        limit_page_length=100
    )

    print(f"Total Opportunities fetched: {len(opps)}")
    frappe.msgprint(f"{len(opps)} Open Opportunities found.")

    # Clear old child table entries
    doc.set("opportunities_nearing_closure", [])

    # Add new rows
    for index, o in enumerate(opps, start=1):
        row = doc.append("opportunities_nearing_closure", {})
        row.opportunity_name = o.opportunity
        row.client = o.party_name or ""
        row.expected_close_date = o.custom_close_date
        row.value = flt(o.custom_actual_revenue or 0.0)
        row.stage = o.stage
        row.opportunityowner = o.opportunity_owner  # ✅ corrected

    # Ignore link validation temporarily
    doc.flags.ignore_links = True

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    frappe.msgprint(f"{len(opps)} Opportunities added successfully.")

    return len(opps)
