frappe.ui.form.on('Lead', {
    onload: function(frm) {
        initialize_fields(frm);
    },

    refresh: function(frm) {
        initialize_fields(frm);
    },

    after_save: function(frm) {
        // Ensure correct options are shown after save
        setTimeout(() => {
            if (frm.doc.custom_vertical) {
                set_sub_vertical_options(frm);
            }
            if (frm.doc.custom_sub_vertical) {
                set_sub_service_options(frm);
            }
        }, 100);
    },

    custom_vertical: function(frm) {
        // Clear dependent fields first
        frm.set_value('custom_sub_vertical', '');
        frm.set_value('custom_subservice', '');
        
        // Then set new options
        setTimeout(() => {
            set_sub_vertical_options(frm);
            toggle_subservice_field(frm);
        }, 50);
    },

    custom_sub_vertical: function(frm) {
        // Clear dependent field first
        frm.set_value('custom_subservice', '');
        
        // Then set new options
        setTimeout(() => {
            set_sub_service_options(frm);
            toggle_subservice_field(frm);
        }, 50);
    }
});

// ---------------- Helper Functions ----------------

function initialize_fields(frm) {
    if (frm.doc.custom_vertical) {
        set_sub_vertical_options(frm);
    }
    if (frm.doc.custom_sub_vertical) {
        set_sub_service_options(frm);
    }
    toggle_subservice_field(frm);
}

// ---------- SET SUB-VERTICAL OPTIONS ----------
function set_sub_vertical_options(frm) {
    let options = [];

    switch (frm.doc.custom_vertical) {
        case 'Permanent Staffing':
            options = ['IT Recruitment', 'Non IT Recruitment'];
            break;
        case 'Talent Management':
            options = ['HR Consulting'];
            break;
        case 'Learning & Development':
            options = ['Posh training and compliance', 'Corporate services', 'Other'];
            break;
        case 'Temporary Staffing':
            options = ['General Staffing', 'Technical Staffing', 'Apprentice Staffing', 'Specialised Staffing', 'Managed Services'];
            break;
        case 'Labour Law Advisory & Compliance':
            options = [
                'Labour Law advisory',
                'Registrations & Licenses',
                'Payroll Compliance',
                'Factory Compliance',
                'Apprenticeship Compliance ( NAPS & NATS )',
                'POSH Act Compliance',
                "Employer & Vendor's Compliance Audit",
                'Industrial Relations',
                'HR Operations Support'
            ];
            break;
        case 'Franchise':
            options = [
                'Total HR Solutions',
                'Staffing - Blue Collar Hiring',
                'Permanent Recruitment - Portal / White Collar Hiring',
                'Labour Law Compliance'
            ];
            break;
        default:
            options = [];
    }

    // Get current value before setting options
    const current_value = frm.doc.custom_sub_vertical;

    // If current value exists but not in new options, keep it (for saved records)
    if (current_value && !options.includes(current_value)) {
        options.push(current_value);
    }

    // Set the options
    frm.set_df_property('custom_sub_vertical', 'options', ['', ...options]);
    
    // Refresh the field to show new options
    frm.refresh_field('custom_sub_vertical');
    
    // Restore the value if it's valid for the current vertical
    if (current_value && options.includes(current_value)) {
        frm.set_value('custom_sub_vertical', current_value);
    }
}

// ---------- SET SUB-SERVICE OPTIONS ----------
function set_sub_service_options(frm) {
    let options = [];

    switch (frm.doc.custom_sub_vertical) {
        case 'Posh training and compliance':
            options = [
                'POSH Awareness (LMS)',
                'Posh Master Class',
                'Posh End-to-End Compliance',
                'Policy Drafting',
                'IC Committee Set Up',
                'IC Committee Refresher Training',
                'Posh Awareness'
            ];
            break;
        case 'Corporate services':
            options = [
                'Leadership Skills Training',
                'Functional Skills Training',
                'Technical Skills Training',
                'Soft Skills Training'
            ];
            break;
        case 'Specialised Staffing':
            options = [
                'Gig Hiring',
                'PWD Hiring (Persons with Disabilities)'
            ];
            break;
        default:
            options = [];
    }

    // Get current value before setting options
    const current_value = frm.doc.custom_subservice;

    // If current value exists but not in new options, keep it (for saved records)
    if (current_value && !options.includes(current_value)) {
        options.push(current_value);
    }

    // Set the options
    frm.set_df_property('custom_subservice', 'options', ['', ...options]);
    
    // Refresh the field to show new options
    frm.refresh_field('custom_subservice');
    
    // Restore the value if it's valid for the current sub-vertical
    if (current_value && options.includes(current_value)) {
        frm.set_value('custom_subservice', current_value);
    }
}

// ---------- SHOW/HIDE FIELD ----------
function toggle_subservice_field(frm) {
    const show_subservice = frm.doc.custom_sub_vertical && 
                           frm.doc.custom_sub_vertical !== 'Other' &&
                           ['Posh training and compliance', 'Corporate services', 'Specialised Staffing'].includes(frm.doc.custom_sub_vertical);
    
    frm.toggle_display('custom_subservice', show_subservice);
    
    // Clear subservice if it shouldn't be shown
    if (!show_subservice && frm.doc.custom_subservice) {
        frm.set_value('custom_subservice', '');
    }
}







