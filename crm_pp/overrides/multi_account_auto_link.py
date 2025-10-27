import frappe
from frappe.utils import now_datetime, add_to_date, get_datetime
import re
import os
from datetime import datetime


def auto_link_all_emails():
    """
    Automatically link Communications to relevant documents (Lead, Opportunity, Customer)
    based on email addresses, regardless of Email Account settings.
    
    Runs every 10 minutes to process unlinked emails from the last 15 minutes.
    """
    try:
        # Get site name for log path
        site_name = frappe.local.site
        log_dir = frappe.get_site_path("private", "logs")
        log_file = os.path.join(log_dir, "auto_link_log.txt")
        
        # Ensure log directory exists
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        # Calculate time threshold (15 minutes ago)
        time_threshold = add_to_date(now_datetime(), minutes=-15)
        
        # Find all Communications created in the last 15 minutes with no links
        unlinked_communications = frappe.db.sql("""
            SELECT DISTINCT c.name, c.sender, c.recipients, c.cc, c.subject, c.creation
            FROM `tabCommunication` c
            LEFT JOIN `tabCommunication Link` cl ON cl.parent = c.name
            WHERE c.creation >= %s
            AND c.communication_type = 'Communication'
            AND cl.name IS NULL
            AND c.sent_or_received = 'Received'
            ORDER BY c.creation DESC
        """, (time_threshold,), as_dict=True)
        
        log_message(log_file, f"\n{'='*80}")
        log_message(log_file, f"Auto-link job started at {now_datetime()}")
        log_message(log_file, f"Found {len(unlinked_communications)} unlinked communication(s)")
        
        linked_count = 0
        
        for comm in unlinked_communications:
            # Extract all email addresses from this communication
            email_addresses = extract_emails(comm.sender, comm.recipients, comm.cc)
            
            if not email_addresses:
                log_message(log_file, f"  [SKIP] {comm.name} - No email addresses found")
                continue
            
            log_message(log_file, f"\n  Processing: {comm.name}")
            log_message(log_file, f"    Subject: {comm.subject or 'No subject'}")
            log_message(log_file, f"    Emails: {', '.join(email_addresses)}")
            
            # Try to find matching documents
            matches = find_matching_documents(email_addresses)
            
            if matches:
                for match in matches:
                    # Check if link already exists to avoid duplicates
                    existing_link = frappe.db.exists("Communication Link", {
                        "parent": comm.name,
                        "link_doctype": match["doctype"],
                        "link_name": match["name"]
                    })
                    
                    if not existing_link:
                        create_communication_link(
                            comm.name, 
                            match["doctype"], 
                            match["name"],
                            match["email"]
                        )
                        linked_count += 1
                        log_message(log_file, 
                            f"    [LINKED] {match['doctype']}: {match['name']} ({match['email']})")
                    else:
                        log_message(log_file, 
                            f"    [EXISTS] Link already exists for {match['doctype']}: {match['name']}")
            else:
                log_message(log_file, f"    [NO MATCH] No matching documents found")
        
        log_message(log_file, f"\nJob completed: {linked_count} new link(s) created")
        log_message(log_file, f"{'='*80}\n")
        
    except Exception as e:
        error_msg = f"Error in auto_link_all_emails: {str(e)}"
        frappe.log_error(error_msg, "Auto Link Emails")
        if 'log_file' in locals():
            log_message(log_file, f"\n[ERROR] {error_msg}\n")


def extract_emails(sender, recipients, cc):
    """
    Extract unique email addresses from sender, recipients, and cc fields.
    
    Args:
        sender (str): Sender email address
        recipients (str): Comma-separated recipients
        cc (str): Comma-separated CC addresses
    
    Returns:
        set: Set of unique email addresses
    """
    emails = set()
    
    # Combine all fields
    all_addresses = [sender or "", recipients or "", cc or ""]
    
    for address_field in all_addresses:
        if not address_field:
            continue
        
        # Extract email addresses using regex
        # Matches email addresses in formats: "email@domain.com" or "Name <email@domain.com>"
        found_emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', address_field)
        emails.update([email.lower() for email in found_emails])
    
    return emails


def find_matching_documents(email_addresses):
    """
    Find Lead, Opportunity, or Customer documents that match the given email addresses.
    
    Args:
        email_addresses (set): Set of email addresses to search for
    
    Returns:
        list: List of dicts with doctype, name, and email
    """
    matches = []
    
    if not email_addresses:
        return matches
    
    # Convert set to list for SQL query
    email_list = list(email_addresses)
    
    # Search in Lead
    try:
        leads = frappe.db.sql("""
            SELECT name, email_id
            FROM `tabLead`
            WHERE email_id IN ({})
            AND status != 'Do Not Contact'
            ORDER BY modified DESC
        """.format(','.join(['%s'] * len(email_list))), email_list, as_dict=True)
        
        for lead in leads:
            matches.append({
                "doctype": "Lead",
                "name": lead.name,
                "email": lead.email_id
            })
    except Exception as e:
        frappe.log_error(f"Error searching Leads: {str(e)}", "Auto Link - Lead Search")
    
    # Search in Opportunity
    try:
        opportunities = frappe.db.sql("""
            SELECT name, contact_email
            FROM `tabOpportunity`
            WHERE contact_email IN ({})
            AND status NOT IN ('Lost', 'Closed')
            ORDER BY modified DESC
        """.format(','.join(['%s'] * len(email_list))), email_list, as_dict=True)
        
        for opp in opportunities:
            matches.append({
                "doctype": "Opportunity",
                "name": opp.name,
                "email": opp.contact_email
            })
    except Exception as e:
        frappe.log_error(f"Error searching Opportunities: {str(e)}", "Auto Link - Opportunity Search")
    
    # Search in Customer
    try:
        customers = frappe.db.sql("""
            SELECT name, email_id
            FROM `tabCustomer`
            WHERE email_id IN ({})
            AND disabled = 0
            ORDER BY modified DESC
        """.format(','.join(['%s'] * len(email_list))), email_list, as_dict=True)
        
        for customer in customers:
            matches.append({
                "doctype": "Customer",
                "name": customer.name,
                "email": customer.email_id
            })
    except Exception as e:
        frappe.log_error(f"Error searching Customers: {str(e)}", "Auto Link - Customer Search")
    
    # Remove duplicates (prioritize Lead > Opportunity > Customer)
    unique_matches = []
    seen_docs = set()
    
    for match in matches:
        doc_key = f"{match['doctype']}::{match['name']}"
        if doc_key not in seen_docs:
            unique_matches.append(match)
            seen_docs.add(doc_key)
    
    return unique_matches


def create_communication_link(communication_name, link_doctype, link_name, email):
    """
    Create a Communication Link entry to link Communication with a document.
    
    Args:
        communication_name (str): Name of the Communication document
        link_doctype (str): DocType to link (Lead, Opportunity, Customer)
        link_name (str): Name of the document to link
        email (str): Email address that matched
    """
    try:
        # Create Communication Link as a child table entry
        communication = frappe.get_doc("Communication", communication_name)
        
        # Add link to the communication
        communication.append("timeline_links", {
            "link_doctype": link_doctype,
            "link_name": link_name
        })
        
        # Save without triggering validation or workflow
        communication.flags.ignore_permissions = True
        communication.flags.ignore_validate = True
        communication.flags.ignore_mandatory = True
        communication.save()
        
        frappe.db.commit()
        
    except Exception as e:
        error_msg = f"Failed to create link for {communication_name} -> {link_doctype}/{link_name}: {str(e)}"
        frappe.log_error(error_msg, "Auto Link - Create Link")
        raise


def log_message(log_file, message):
    """
    Write a message to the log file.
    
    Args:
        log_file (str): Path to log file
        message (str): Message to log
    """
    try:
        with open(log_file, 'a') as f:
            f.write(f"{message}\n")
    except Exception as e:
        frappe.log_error(f"Failed to write to log file: {str(e)}", "Auto Link - Logging")


