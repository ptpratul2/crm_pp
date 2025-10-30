"""Setup Form Integrations"""

import frappe


def list_all_lead_fields():
    """List all available Lead doctype fields for mapping"""
    
    meta = frappe.get_meta('Lead')
    fields = []
    
    for df in meta.fields:
        # Skip child tables, attachments, and system fields
        if df.fieldtype not in ['Table', 'Table MultiSelect', 'Attach', 'Attach Image'] and not df.hidden:
            fields.append({
                'fieldname': df.fieldname,
                'label': df.label or df.fieldname,
                'fieldtype': df.fieldtype,
                'reqd': df.reqd
            })
    
    # Sort by label
    fields.sort(key=lambda x: x['label'])
    
    print('\n' + '='*100)
    print('AVAILABLE LEAD FIELDS FOR WEBHOOK MAPPING')
    print('='*100)
    print(f'\nTotal mappable fields: {len(fields)}\n')
    print(f'{"Field Name":<35} {"Label":<40} {"Type":<15} {"Required"}')
    print('-'*100)
    
    for f in fields:
        req = '✅ Yes' if f['reqd'] else ''
        print(f'{f["fieldname"]:<35} {f["label"]:<40} {f["fieldtype"]:<15} {req}')
    
    print('\n' + '='*100)
    print('\nMOST COMMONLY USED FIELDS FOR WEB FORMS:')
    print('='*100)
    
    common_fields = [
        ('lead_name', 'Lead Name (Person\'s Name)', '✅ Required'),
        ('email_id', 'Email ID', '✅ Required'),
        ('phone', 'Phone', 'Optional'),
        ('mobile_no', 'Mobile Number', 'Optional'),
        ('company_name', 'Company Name', 'Optional'),
        ('custom_message', 'Message/Notes/Comments', 'Optional'),
        ('website', 'Website URL', 'Optional'),
        ('industry', 'Industry', 'Optional'),
        ('source', 'Lead Source', 'Optional'),
        ('custom_vertical', 'Vertical (Service Line)', 'Optional'),
        ('city', 'City', 'Optional'),
        ('state', 'State', 'Optional'),
        ('country', 'Country', 'Optional'),
    ]
    
    print(f'\n{"Field Name":<35} {"Label":<40} {"Status"}')
    print('-'*90)
    for fname, label, status in common_fields:
        print(f'{fname:<35} {label:<40} {status}')
    
    print('\n')
    
    return fields


def verify_lead(lead_id):
    """Verify a lead was created correctly with all fields"""
    import json
    
    if not frappe.db.exists("Lead", lead_id):
        print(f"❌ Lead {lead_id} not found!")
        return
    
    lead = frappe.get_doc("Lead", lead_id)
    
    print(f"\n{'='*70}")
    print(f"✅ LEAD VERIFICATION: {lead_id}")
    print(f"{'='*70}\n")
    
    fields_to_check = [
        ("Lead Name", "lead_name"),
        ("Email ID", "email_id"),
        ("Company Name", "company_name"),
        ("Phone", "phone"),
        ("Mobile", "mobile_no"),
        ("Message", "custom_message"),
        ("Vertical", "custom_vertical"),
        ("Sub Vertical", "custom_sub_vertical"),
        ("Source", "source"),
        ("Status", "status"),
    ]
    
    for label, fieldname in fields_to_check:
        value = getattr(lead, fieldname, None)
        if value:
            print(f"{label:<20}: {value}")
    
    print(f"\n{'='*70}")
    print(f"🔗 View Lead: https://crm.promptpersonnel.com/app/lead/{lead_id}")
    print(f"{'='*70}\n")


def rename_corporate_training():
    """Rename corporate_training to corporate-training by copying"""
    
    old_name = "corporate_training"
    new_name = "corporate-training"
    
    if frappe.db.exists("Form Integration", new_name):
        print(f"✅ '{new_name}' already exists")
        print(f"📍 Access: https://crm.promptpersonnel.com/app/form-integration/{new_name}")
        return new_name
    
    if frappe.db.exists("Form Integration", old_name):
        # Copy the old document
        old_doc = frappe.get_doc("Form Integration", old_name)
        new_doc = frappe.copy_doc(old_doc)
        
        # Update the identifier
        new_doc.name = new_name
        new_doc.form_identifier = new_name
        
        # Insert the new document
        new_doc.insert(ignore_permissions=True)
        print(f"✅ Created new Form Integration: '{new_name}'")
        
        # Delete the old one
        frappe.delete_doc("Form Integration", old_name, ignore_permissions=True)
        print(f"🗑️  Deleted old Form Integration: '{old_name}'")
        
        frappe.db.commit()
        print(f"📍 Access: https://crm.promptpersonnel.com/app/form-integration/{new_name}")
        return new_name
    else:
        print(f"❌ '{old_name}' not found")
        return None


def setup_promptpersonnel_form():
    """Create Form Integration for promptpersonnel.in forms"""
    
    form_id = "promptpersonnel.in"
    
    # Check if already exists
    if frappe.db.exists("Form Integration", form_id):
        print(f"⚠️  Form Integration '{form_id}' already exists!")
        doc = frappe.get_doc("Form Integration", form_id)
        doc.field_mappings = []  # Clear existing
    else:
        print(f"✅ Creating Form Integration: {form_id}")
        doc = frappe.new_doc("Form Integration")
        doc.form_identifier = form_id
    
    # Basic fields
    doc.form_title = "Prompt Personnel Website Forms"
    doc.is_active = 1
    doc.description = "Leads from all forms at promptpersonnel.in"
    
    # Field mappings - Map to correct Lead fields (handle multiple field name variations)
    mappings = [
        {"source_field": "last_name", "target_field": "lead_name", "is_required": 0, "transformation_type": "Title Case", "default_value": ""},
        {"source_field": "name", "target_field": "lead_name", "is_required": 0, "transformation_type": "Title Case", "default_value": ""},
        {"source_field": "email", "target_field": "email_id", "is_required": 0, "transformation_type": "Lowercase", "default_value": ""},
        {"source_field": "company", "target_field": "company_name", "is_required": 0, "transformation_type": "Trim", "default_value": ""},
        {"source_field": "mobile", "target_field": "phone", "is_required": 0, "transformation_type": "Trim", "default_value": ""},
        {"source_field": "phone", "target_field": "phone", "is_required": 0, "transformation_type": "Trim", "default_value": ""},
        {"source_field": "00NS3000004ZTI6", "target_field": "custom_message", "is_required": 0, "transformation_type": "Trim", "default_value": ""},
        {"source_field": "message", "target_field": "custom_message", "is_required": 0, "transformation_type": "Trim", "default_value": ""}
    ]
    
    for m in mappings:
        doc.append("field_mappings", m)
    
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    
    print(f"\n{'='*70}")
    print("✅ Form Integration Created Successfully!")
    print(f"{'='*70}")
    print(f"Form ID: {doc.name}")
    print(f"Title: {doc.form_title}")
    print(f"Mappings: {len(doc.field_mappings)} fields")
    print(f"\n📍 Access: https://crm.promptpersonnel.com/app/form-integration/{doc.form_identifier}")
    print(f"{'='*70}\n")
    
    return doc.name


def setup_corporate_training():
    """Create Form Integration for corporate training"""
    
    form_id = "corporate-training"  # Changed to use hyphen
    
    # Check if already exists
    if frappe.db.exists("Form Integration", form_id):
        print(f"⚠️  Form Integration '{form_id}' already exists!")
        doc = frappe.get_doc("Form Integration", form_id)
        doc.field_mappings = []  # Clear existing
    else:
        print(f"✅ Creating Form Integration: {form_id}")
        doc = frappe.new_doc("Form Integration")
        doc.form_identifier = form_id
    
    # Basic fields
    doc.form_title = "Corporate Training Lead Form"
    doc.is_active = 1
    doc.description = "Leads from corporate training landing page at promptpersonnel.in"
    
    # Field mappings - Map to correct Lead fields
    mappings = [
        {"source_field": "last_name", "target_field": "lead_name", "is_required": 1, "transformation_type": "Title Case", "default_value": ""},
        {"source_field": "email", "target_field": "email_id", "is_required": 1, "transformation_type": "Lowercase", "default_value": ""},
        {"source_field": "company", "target_field": "company_name", "is_required": 0, "transformation_type": "Trim", "default_value": ""},
        {"source_field": "mobile", "target_field": "phone", "is_required": 0, "transformation_type": "Trim", "default_value": ""},
        {"source_field": "00NS3000004ZTI6", "target_field": "custom_message", "is_required": 0, "transformation_type": "Trim", "default_value": ""}
    ]
    
    for m in mappings:
        doc.append("field_mappings", m)
    
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    
    print(f"\n{'='*60}")
    print("✅ Form Integration Created Successfully!")
    print(f"{'='*60}")
    print(f"Form ID: {doc.name}")
    print(f"Title: {doc.form_title}")
    print(f"Mappings: {len(doc.field_mappings)} fields")
    print(f"\n📍 Access: https://crm.promptpersonnel.com/app/form-integration/{doc.form_identifier}")
    print(f"{'='*60}\n")
    
    return doc.name

