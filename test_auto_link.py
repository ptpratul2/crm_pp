#!/usr/bin/env python3
"""
Test script for multi-account auto-link email functionality.
Run this from your frappe-bench directory:
    bench --site [your-site] execute crm_pp.test_auto_link.test_auto_link
"""

import frappe

def test_auto_link():
    """Test the auto-link functionality manually."""
    print("\n" + "="*80)
    print("TESTING AUTO-LINK EMAIL FUNCTIONALITY")
    print("="*80 + "\n")
    
    # Import the function
    from crm_pp.overrides.multi_account_auto_link import auto_link_all_emails
    
    print("1. Checking for unlinked communications...")
    
    # Get count of unlinked communications
    unlinked = frappe.db.sql("""
        SELECT COUNT(DISTINCT c.name) as count
        FROM `tabCommunication` c
        LEFT JOIN `tabCommunication Link` cl ON cl.parent = c.name
        WHERE cl.name IS NULL
        AND c.communication_type = 'Communication'
        AND c.sent_or_received = 'Received'
    """, as_dict=True)
    
    print(f"   Found {unlinked[0].count} unlinked communication(s) in total")
    
    print("\n2. Running auto_link_all_emails()...")
    try:
        auto_link_all_emails()
        print("   ✓ Function executed successfully!")
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return
    
    print("\n3. Checking results...")
    
    # Check log file
    log_file = frappe.get_site_path("private", "logs", "auto_link_log.txt")
    print(f"\n   Log file location: {log_file}")
    
    try:
        with open(log_file, 'r') as f:
            lines = f.readlines()
            if lines:
                print("\n   Last 20 lines of log:")
                print("   " + "-"*76)
                for line in lines[-20:]:
                    print("   " + line.rstrip())
                print("   " + "-"*76)
            else:
                print("   (Log file is empty)")
    except FileNotFoundError:
        print("   (Log file not yet created)")
    except Exception as e:
        print(f"   Could not read log file: {str(e)}")
    
    print("\n" + "="*80)
    print("TEST COMPLETED")
    print("="*80 + "\n")


def show_recent_communications():
    """Show recent communications and their link status."""
    print("\n" + "="*80)
    print("RECENT COMMUNICATIONS (Last 24 hours)")
    print("="*80 + "\n")
    
    comms = frappe.db.sql("""
        SELECT 
            c.name,
            c.subject,
            c.sender,
            c.creation,
            GROUP_CONCAT(cl.link_doctype, ': ', cl.link_name) as links
        FROM `tabCommunication` c
        LEFT JOIN `tabCommunication Link` cl ON cl.parent = c.name
        WHERE c.creation >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND c.communication_type = 'Communication'
        AND c.sent_or_received = 'Received'
        GROUP BY c.name
        ORDER BY c.creation DESC
        LIMIT 10
    """, as_dict=True)
    
    if not comms:
        print("No communications found in the last 24 hours.\n")
        return
    
    for comm in comms:
        print(f"Communication: {comm.name}")
        print(f"  Subject: {comm.subject or '(No subject)'}")
        print(f"  From: {comm.sender}")
        print(f"  Created: {comm.creation}")
        print(f"  Links: {comm.links or '(Not linked)'}")
        print()


if __name__ == "__main__":
    test_auto_link()
    show_recent_communications()


