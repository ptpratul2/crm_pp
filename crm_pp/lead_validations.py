# # your_app/lead_validations.py
# import re
# import frappe

# # digits, spaces, slash, comma, parentheses, plus, hyphen
# ALLOWED_PHONE_REGEX = re.compile(r'^[0-9\s\/,\(\)\+\-]*$')

# def _is_allowed(val: str) -> bool:
#     if not val:
#         return True
#     return bool(ALLOWED_PHONE_REGEX.fullmatch(val))

# def validate_lead_phone(doc, method=None):
#     # Normalize: trim spaces (optional)
#     if doc.mobile_no:
#         doc.mobile_no = doc.mobile_no.strip()
#     if doc.phone:
#         doc.phone = doc.phone.strip()

#     errors = []
#     if doc.mobile_no and not _is_allowed(doc.mobile_no):
#         errors.append("Mobile No: only digits, space, / , ( ) + - are allowed.")
#     if doc.phone and not _is_allowed(doc.phone):
#         errors.append("Phone: only digits, space, / , ( ) + - are allowed.")

#     if errors:
#         frappe.throw("\n".join(errors))

