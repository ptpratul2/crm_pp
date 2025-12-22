erpnext.CustomLeadController = class CustomLeadController extends frappe.ui.form.Controller {
    setup() {
        this.frm.make_methods = {
            Customer: this.make_customer.bind(this),
            Opportunity: this.make_opportunity.bind(this),
        };

        this.frm.set_df_property("first_name", "reqd", true);
    }

    onload() {
        this.frm.set_query("lead_owner", function (doc, cdt, cdn) {
            return { query: "frappe.core.doctype.user.user.user_query" };
        });
    }

    refresh() {
        let doc = this.frm.doc;
        erpnext.toggle_naming_series();

        if (!this.frm.is_new() && doc.__onload && !doc.__onload.is_customer) {
            this.frm.add_custom_button(__("Customer"), this.make_customer.bind(this), __("Create"));
            this.frm.add_custom_button(__("Opportunity"), this.make_opportunity.bind(this), __("Create"));
        }

        if (!this.frm.is_new()) {
            frappe.contacts.render_address_and_contact(this.frm);
        } else {
            frappe.contacts.clear_address_and_contact(this.frm);
        }

        this.show_notes();
        this.show_activities();
    }

    make_customer() {
        frappe.model.open_mapped_doc({
            method: "erpnext.crm.doctype.lead.lead.make_customer",
            frm: this.frm,
        });
    }

    async make_opportunity() {
        frappe.model.open_mapped_doc({
            method: "erpnext.crm.doctype.lead.lead.make_opportunity",
            frm: this.frm,
        });
    }

    show_notes() {
        if (this.frm.doc.docstatus == 1) return;

        const crm_notes = new erpnext.utils.CRMNotes({
            frm: this.frm,
            notes_wrapper: $(this.frm.fields_dict.notes_html.wrapper),
        });
        crm_notes.refresh();
    }

    show_activities() {
        if (this.frm.doc.docstatus == 1) return;

        const crm_activities = new erpnext.utils.CRMActivities({
            frm: this.frm,
            open_activities_wrapper: $(this.frm.fields_dict.open_activities_html.wrapper),
            all_activities_wrapper: $(this.frm.fields_dict.all_activities_html.wrapper),
            form_wrapper: $(this.frm.wrapper),
        });
        crm_activities.refresh();
    }
};

extend_cscript(cur_frm.cscript, new erpnext.CustomLeadController({ frm: cur_frm }));