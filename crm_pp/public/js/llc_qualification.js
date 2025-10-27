frappe.ui.form.on('Lead', {
    // ============================================
    // REAL-TIME SCORE CALCULATION & CHECKBOX AUTO-UPDATE
    // ============================================
    
    // Trigger recalculation on any relevant field change
    onload: function(frm) {
        calculate_llc_qualification_score(frm);
    },
    
    refresh: function(frm) {
        calculate_llc_qualification_score(frm);
    },
    
    custom_scope_of_enquiry: function(frm) {
        calculate_llc_qualification_score(frm);
    },
    
    custom_exclusion_of_personal_grievances: function(frm) {
        calculate_llc_qualification_score(frm);
    },
    
    custom_not_a_sub_contracting_lead: function(frm) {
        calculate_llc_qualification_score(frm);
    },
    
    custom_no_of_officesplants: function(frm) {
        calculate_llc_qualification_score(frm);
    },
    
    custom_turnover_in_inr: function(frm) {
        calculate_llc_qualification_score(frm);
    },
    
    custom_vertical: function(frm) {
        calculate_llc_qualification_score(frm);
    },

    // ============================================
    // VALIDATION ON SAVE
    // ============================================
    validate: function(frm) {
        if (frm.doc.custom_vertical !== "Labour Law Advisory & Compliance") {
            return; // Only apply to LLC vertical
        }

        // Recalculate score before validation
        let score = calculate_llc_qualification_score(frm);
        
        const current_status = (frm.doc.status || "").trim();
        const previous_status = (frm.doc.__last_status || "").trim();

        // ============================================
        // PREVENT INVALID STATUS TRANSITIONS
        // ============================================
        if (previous_status === "Converted" && current_status === "Unqualified") {
            frappe.throw({
                title: __("❌ Invalid Status Change"),
                message: __("You cannot move a Converted lead back to Unqualified. Please contact your administrator if you need to reverse this lead.")
            });
        }

        // ============================================
        // QUALIFICATION LOGIC - ONLY AFTER NURTURING
        // ============================================
        const stages_requiring_qualification = ["Qualified", "Converted"];
        
        if (stages_requiring_qualification.includes(current_status)) {
            
            // --- Check Mandatory Checkboxes ---
            const mandatory_checks = [
                { field: "custom_scope_of_enquiry", label: "Scope of Enquiry" },
                { field: "custom_exclusion_of_personal_grievances", label: "Exclusion of Personal Grievances" },
                { field: "custom_not_a_sub_contracting_lead", label: "Not a Sub-contracting Lead" }
            ];

            let missing_fields = [];
            mandatory_checks.forEach(check => {
                if (!frm.doc[check.field]) {
                    missing_fields.push(check.label);
                }
            });

            // --- If mandatory fields are missing ---
            if (missing_fields.length > 0) {
                frm.set_value("status", "Unqualified");
                
                frappe.msgprint({
                    title: __("⚠️ Lead Unqualified"),
                    message: __(`
                        <div style="padding: 15px;">
                            <p style="font-size: 15px; margin-bottom: 15px;">
                                <strong>Missing Required Criteria:</strong>
                            </p>
                            <ul style="margin-left: 20px; color: #d73a49; font-size: 14px;">
                                ${missing_fields.map(f => `<li>${f}</li>`).join('')}
                            </ul>
                        </div>
                    `),
                    indicator: "red"
                });
                
                frappe.validated = false; // Prevent save
                return;
            }

            // --- Check if score is sufficient ---
            if (score < 6) {
                frm.set_value("status", "Unqualified");
                
                frappe.msgprint({
                    title: __("⚠️ Lead Unqualified"),
                    message: __(`
                        <div style="padding: 15px; text-align: center;">
                            <div style="padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107; margin: 10px 0;">
                                <div style="font-size: 18px; font-weight: bold; color: #856404;">
                                    Score: ${score} / 44
                                </div>
                                <div style="font-size: 14px; color: #856404; margin-top: 5px;">
                                    Minimum Required: 6
                                </div>
                            </div>
                        </div>
                    `),
                    indicator: "red"
                });
                
                frappe.validated = false; // Prevent save
                return;
            }

            // ============================================
            // LEAD QUALIFIED - AUTO CONVERT
            // ============================================
            if (current_status === "Qualified" && score >= 30) {
                frm.set_value("status", "Converted");
                
                frappe.msgprint({
                    title: __("🎉 Lead Successfully Converted!"),
                    message: __(`
                        <div style="text-align: center; padding: 15px;">
                            <p style="font-size: 16px; margin-bottom: 10px;">
                                <strong>Congratulations!</strong>
                            </p>
                            <div style="padding: 20px; background: #d4edda; border-left: 4px solid #28a745; margin: 15px 0;">
                                <div style="font-size: 20px; font-weight: bold; color: #155724;">
                                    Final Score: ${score} / 44
                                </div>
                            </div>
                            <p style="color: #155724; font-weight: 500;">
                                Lead has met all qualification criteria
                            </p>
                        </div>
                    `),
                    indicator: "green"
                });
            }
        }

        // Store current status for next validation
        frm.doc.__last_status = current_status;
    }
});

// ============================================
// SCORING & CHECKBOX CALCULATION FUNCTION
// ============================================
function calculate_llc_qualification_score(frm) {
    // Only calculate for Labour Law Advisory & Compliance vertical
    if (frm.doc.custom_vertical !== "Labour Law Advisory & Compliance") {
        return 0;
    }

    let score = 0;
    let breakdown = [];

    // --- 1. Scope of Enquiry (9 points) - MANDATORY ---
    if (frm.doc.custom_scope_of_enquiry) {
        score += 9;
        breakdown.push("✓ Scope of Enquiry: 9 pts");
    } else {
        breakdown.push("✗ Scope of Enquiry: 0 pts");
    }

    // --- 2. Exclusion of Personal Grievances (6 points) - MANDATORY ---
    if (frm.doc.custom_exclusion_of_personal_grievances) {
        score += 6;
        breakdown.push("✓ Exclusion of Personal Grievances: 6 pts");
    } else {
        breakdown.push("✗ Exclusion of Personal Grievances: 0 pts");
    }

    // --- 3. Not a Sub-contracting Lead (9 points) - MANDATORY ---
    if (frm.doc.custom_not_a_sub_contracting_lead) {
        score += 9;
        breakdown.push("✓ Not a Sub-contracting Lead: 9 pts");
    } else {
        breakdown.push("✗ Not a Sub-contracting Lead: 0 pts");
    }

    // --- 4. Number of Offices/Plants (6-10 points) ---
    if (frm.doc.custom_no_of_officesplants) {
        let volume_score = 0;
        switch (frm.doc.custom_no_of_officesplants.trim()) {
            case "1–2   Single / Local Operation":
                volume_score = 6;
                break;
            case "3–10 Regional Presence":
                volume_score = 8;
                break;
            case "11+	 Multi-location / National Presence":
                volume_score = 10;
                break;
            default:
                volume_score = 0;
        }
        score += volume_score;
        frm.set_value("custom_multilocation_presence", volume_score > 0 ? 1 : 0);
        if (volume_score > 0) {
            breakdown.push(`✓ Number of Offices/Plants (${frm.doc.custom_no_of_officesplants}): ${volume_score} pts`);
        } else {
            breakdown.push("✗ Number of Offices/Plants: 0 pts");
        }
    } else {
        frm.set_value("custom_multilocation_presence", 0);
        breakdown.push("✗ Number of Offices/Plants: Not provided");
    }

    // --- 5. Turnover (6-10 points) ---
    if (frm.doc.custom_turnover_in_inr) {
        let turnover_score = 0;
        switch (frm.doc.custom_turnover_in_inr.trim()) {
            case "Less than 50 Cr":
                turnover_score = 6;
                break;
            case "50 Cr to 200 Cr":
                turnover_score = 8;
                break;
            case "200 and above":
                turnover_score = 10;
                break;
            default:
                turnover_score = 0;
        }
        score += turnover_score;
        frm.set_value("custom_turnover", turnover_score > 0 ? 1 : 0);
        if (turnover_score > 0) {
            breakdown.push(`✓ Turnover (${frm.doc.custom_turnover_in_inr}): ${turnover_score} pts`);
        } else {
            breakdown.push("✗ Turnover: 0 pts");
        }
    } else {
        frm.set_value("custom_turnover", 0);
        breakdown.push("✗ Turnover: Not provided");
    }

    // --- Save Final Score ---
    frm.set_value("custom_qualification_score", score);
    
    // --- Show Real-Time Score Display ---
    display_llc_realtime_score(frm, score, breakdown);

    return score;
}

// ============================================
// REAL-TIME SCORE DISPLAY FUNCTION
// ============================================
function display_llc_realtime_score(frm, score, breakdown) {
    // Check if all mandatory checkboxes are checked
    let all_mandatory_checked = 
        frm.doc.custom_scope_of_enquiry &&
        frm.doc.custom_exclusion_of_personal_grievances &&
        frm.doc.custom_not_a_sub_contracting_lead;
    
    // Determine if lead qualifies (score >= 6 AND all mandatory checks)
    let qualifies = score >= 6 && all_mandatory_checked;
    
    // Color coding based on qualification status
    let indicator_color = qualifies ? "#28a745" : "#dc3545";
    let indicator_bg = qualifies ? "#d4edda" : "#f8d7da";
    let status_text = qualifies ? "✓ QUALIFIES" : "✗ DOES NOT QUALIFY";
    let icon = qualifies ? "✓" : "⚠";
    
    // Build score breakdown HTML
    let breakdown_html = breakdown.map(item => `<div style="font-size: 12px; padding: 2px 0;">${item}</div>`).join('');
    
    // Create or update the score display card
    let score_html = `
        <div style="
            position: sticky;
            top: 10px;
            padding: 15px;
            background: ${indicator_bg};
            border-left: 5px solid ${indicator_color};
            border-radius: 5px;
            margin: 10px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: ${indicator_color}; font-size: 16px;">
                    ${icon} LLC Qualification Score
                </h4>
                <span style="
                    font-size: 24px;
                    font-weight: bold;
                    color: ${indicator_color};
                ">${score} / 44</span>
            </div>
            <div style="
                background: white;
                padding: 5px 10px;
                border-radius: 3px;
                text-align: center;
                font-weight: bold;
                color: ${indicator_color};
                margin-bottom: 10px;
            ">
                ${status_text} (Minimum: 6)
            </div>
            <details style="margin-top: 10px; cursor: pointer;">
                <summary style="font-weight: bold; color: #666; user-select: none;">
                    📊 Score Breakdown
                </summary>
                <div style="margin-top: 10px; padding-left: 10px; border-left: 2px solid #ddd;">
                    ${breakdown_html || '<div style="color: #999;">No criteria met yet</div>'}
                </div>
            </details>
        </div>
    `;
    
    // Update the description of the score field with visual display
    if (frm.fields_dict.custom_qualification_score) {
        frm.set_df_property('custom_qualification_score', 'description', score_html);
    }
    
    // Also show in dashboard if vertical is Labour Law Advisory & Compliance
    if (frm.doc.custom_vertical === "Labour Law Advisory & Compliance") {
        // Remove existing dashboard if any
        frm.dashboard.clear_headline();
        
        // Add score to dashboard
        frm.dashboard.set_headline_alert(
            `<div style="font-size: 14px;">
                <strong>LLC Qualification Score:</strong> 
                <span style="color: ${indicator_color}; font-weight: bold; font-size: 16px;">
                    ${score} / 44
                </span>
                <span style="margin-left: 10px; color: ${indicator_color};">
                    ${status_text}
                </span>
            </div>`,
            qualifies ? 'green' : 'red'
        );
    }
}

