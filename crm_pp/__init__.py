__version__ = "0.0.1"



from erpnext.crm.doctype.opportunity import opportunity
from crm_pp.crm_pp.opportunity_override import do_nothing_after_insert

opportunity.Opportunity.after_insert = do_nothing_after_insert

