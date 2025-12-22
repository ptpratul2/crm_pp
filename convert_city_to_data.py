#!/usr/bin/env python3
"""
Convert city field back to Data type with autocomplete

Usage:
    bench --site [site-name] console < convert_city_to_data.py

Or from bench console:
    exec(open('apps/crm_pp/convert_city_to_data.py').read())
"""

import frappe
from frappe.custom.doctype.property_setter.property_setter import make_property_setter

def convert_city_to_data_field():
    """Convert city field from Select to Data type for autocomplete"""
    
    try:
        doctypes = ["Lead", "Opportunity"]
        
        for doctype in doctypes:
            print(f"\nConverting city field for {doctype} to Data type...")
            
            # Delete existing property setters for city field
            existing_setters = frappe.get_all(
                "Property Setter",
                filters={
                    "doc_type": doctype,
                    "field_name": "city"
                },
                pluck="name"
            )
            
            for setter in existing_setters:
                frappe.delete_doc("Property Setter", setter, force=1)
                print(f"  Deleted existing property setter: {setter}")
            
            # Set field type to Data (allows free typing)
            make_property_setter(
                doctype,
                "city",
                "fieldtype",
                "Data",
                "Data",
                validate_fields_for_doctype=False
            )
            
            # Add description
            make_property_setter(
                doctype,
                "city",
                "description",
                "Type to search from 400+ cities",
                "Text",
                validate_fields_for_doctype=False
            )
            
            print(f"✓ Successfully converted city field for {doctype} to Data type")
        
        frappe.db.commit()
        print("\n✓ City field conversion complete!")
        print("\nNext steps:")
        print("1. Run: bench build --app crm_pp")
        print("2. Run: bench clear-cache")
        print("3. Refresh your browser")
        print("4. You can now type OR select from autocomplete suggestions")
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        frappe.db.rollback()
        import traceback
        traceback.print_exc()

# Run the conversion
if __name__ == "__main__":
    convert_city_to_data_field()
else:
    convert_city_to_data_field()




