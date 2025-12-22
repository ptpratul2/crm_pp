"""
Opportunity event handlers for CRM PP app
"""
import frappe
from frappe import _


def set_customer_id(doc, method=None):
    """
    Automatically set custom_customer_id field with the Customer document name
    when an Opportunity is created or updated.
    
    This links the Customer to the Opportunity for better relationship tracking.
    Works for both:
    - Opportunities created from Customer (party_name = Customer ID)
    - Opportunities created from Lead (finds Customer via lead_name link)
    
    Args:
        doc: Opportunity document
        method: Event method (validate, before_save, etc.)
    """
    # Skip if custom_customer_id is already set and party_name hasn't changed
    if doc.custom_customer_id and not doc.has_value_changed("party_name"):
        return
    
    try:
        customer_id = None
        
        if doc.opportunity_from == "Customer" and doc.party_name:
            # Direct link: party_name contains the Customer document ID
            if frappe.db.exists("Customer", doc.party_name):
                customer_id = doc.party_name
                frappe.logger().info(f"Found Customer {customer_id} from party_name for Opportunity {doc.name}")
            else:
                frappe.logger().warning(f"Customer {doc.party_name} not found for Opportunity {doc.name}")
                
        elif doc.opportunity_from == "Lead" and doc.party_name:
            # Indirect link: Find Customer created from this Lead
            # When Lead is converted, Customer stores the Lead ID in 'lead_name' field
            customer_id = frappe.db.get_value("Customer", {"lead_name": doc.party_name}, "name")
            
            if customer_id:
                frappe.logger().info(f"Found Customer {customer_id} via Lead {doc.party_name} for Opportunity {doc.name}")
            else:
                frappe.logger().debug(f"No Customer found for Lead {doc.party_name} yet (Opportunity {doc.name})")
        
        # Set the customer_id if found
        if customer_id:
            doc.custom_customer_id = customer_id
            
    except Exception as e:
        frappe.logger().error(f"Error setting customer_id for Opportunity {doc.name}: {str(e)}")
        # Don't throw error - just log it to prevent blocking the save

