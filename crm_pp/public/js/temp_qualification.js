frappe.ui.form.on('Lead', {
    // ============================================
    // REAL-TIME SCORE CALCULATION & CHECKBOX AUTO-UPDATE
    // ============================================
    
    // Trigger recalculation on any relevant field change
    onload: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    refresh: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    custom_company_establishment_year: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    custom_compliance_scope_pfesi_etc: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    custom_minimum_wages: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    custom_client_due_diligence: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    custom_recruitment_doability_approved_temp: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    custom_company_type: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    custom_employment_tenure_temp: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    custom_recruitment_volume: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    custom_turnover_in_inr: function(frm) {
        calculate_temp_qualification_score(frm);
    },
    
    custom_vertical: function(frm) {
        calculate_temp_qualification_score(frm);
    },

    // ============================================
    // VALIDATION ON SAVE
    // ============================================
    validate: function(frm) {
        if (frm.doc.custom_vertical !== "Temporary Staffing") {
            return; // Only apply to Temporary Staffing vertical
        }

        // Recalculate score before validation
        let score = calculate_temp_qualification_score(frm);
        
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
                { field: "custom_recruitment_doability_approved_temp", label: "Recruitment Do-ability Approved" },
                { field: "custom_employment_tenure_temp", label: "Employment Tenure" },
                { field: "custom_minimum_wages", label: "Minimum Wages" },
                { field: "custom_compliance_scope_pfesi_etc", label: "Compliance Scope (PF/ESI etc.)" }
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
            if (score < 8) {
                frm.set_value("status", "Unqualified");
                
                frappe.msgprint({
                    title: __("⚠️ Lead Unqualified"),
                    message: __(`
                        <div style="padding: 15px; text-align: center;">
                            <div style="padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107; margin: 10px 0;">
                                <div style="font-size: 18px; font-weight: bold; color: #856404;">
                                    Score: ${score} / 70
                                </div>
                                <div style="font-size: 14px; color: #856404; margin-top: 5px;">
                                    Minimum Required: 8
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
            if (current_status === "Qualified" && score >= 50) {
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
                                    Final Score: ${score} / 70
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
function calculate_temp_qualification_score(frm) {
    // Only calculate for Temporary Staffing vertical
    if (frm.doc.custom_vertical !== "Temporary Staffing") {
        return 0;
    }

    let score = 0;
    let breakdown = [];

    // --- 1. Company Age (6 points) ---
    if (frm.doc.custom_company_establishment_year) {
        let currentYear = new Date().getFullYear();
        let companyAge = currentYear - frm.doc.custom_company_establishment_year;
        if (companyAge >= 3) {
            frm.set_value("custom_company_establishment", 1);
            score += 6;
            breakdown.push("✓ Company Age (≥3 years): 6 pts");
        } else {
            frm.set_value("custom_company_establishment", 0);
            breakdown.push("✗ Company Age (<3 years): 0 pts");
        }
    } else {
        frm.set_value("custom_company_establishment", 0);
        breakdown.push("✗ Company Age: Not provided");
    }

    // --- 2. Compliance Scope (PF/ESI etc.) (10 points) - MANDATORY ---
    if (frm.doc.custom_compliance_scope_pfesi_etc) {
        score += 10;
        breakdown.push("✓ Compliance Scope (PF/ESI etc.): 10 pts");
    } else {
        breakdown.push("✗ Compliance Scope (PF/ESI etc.): 0 pts");
    }

    // --- 3. Minimum Wages (7 points) - MANDATORY ---
    if (frm.doc.custom_minimum_wages) {
        score += 7;
        breakdown.push("✓ Minimum Wages: 7 pts");
    } else {
        breakdown.push("✗ Minimum Wages: 0 pts");
    }

    // --- 4. Client Due Diligence (8 points) ---
    if (frm.doc.custom_client_due_diligence) {
        score += 8;
        breakdown.push("✓ Client Due Diligence: 8 pts");
    } else {
        breakdown.push("✗ Client Due Diligence: 0 pts");
    }

    // --- 5. Recruitment Do-ability Approved (10 points) - MANDATORY ---
    if (frm.doc.custom_recruitment_doability_approved_temp) {
        score += 10;
        breakdown.push("✓ Recruitment Do-ability Approved: 10 pts");
    } else {
        breakdown.push("✗ Recruitment Do-ability Approved: 0 pts");
    }

    // --- 6. Company Type (6 points) ---
    if (["Private Limited", "Listed"].includes(frm.doc.custom_company_type)) {
        score += 6;
        frm.set_value("custom_company_temp", 1);
        breakdown.push(`✓ Company Type (${frm.doc.custom_company_type}): 6 pts`);
    } else {
        frm.set_value("custom_company_temp", 0);
        if (frm.doc.custom_company_type) {
            breakdown.push(`✗ Company Type (${frm.doc.custom_company_type}): 0 pts`);
        } else {
            breakdown.push("✗ Company Type: Not provided");
        }
    }

    // --- 7. Employment Tenure (6 points) - MANDATORY field, score based on value ---
    if (frm.doc.custom_employment_tenure_temp && frm.doc.custom_employment_tenure_temp > 1) {
        score += 6;
        frm.set_value("custom_employment_tenure", 1);
        breakdown.push(`✓ Employment Tenure (${frm.doc.custom_employment_tenure_temp} months): 6 pts`);
    } else {
        frm.set_value("custom_employment_tenure", 0);
        if (frm.doc.custom_employment_tenure_temp) {
            breakdown.push(`✗ Employment Tenure (${frm.doc.custom_employment_tenure_temp} month): 0 pts`);
        } else {
            breakdown.push("✗ Employment Tenure: Not provided");
        }
    }

    // --- 8. Recruitment Volume (6-10 points) ---
    if (frm.doc.custom_recruitment_volume) {
        let volume_score = 0;
        switch (frm.doc.custom_recruitment_volume.trim()) {
            case "10 to 50": 
                volume_score = 6; 
                break;
            case "51 to 100": 
                volume_score = 9; 
                break;
            case "Above 100": 
                volume_score = 10; 
                break;
            default: 
                volume_score = 0;
        }
        score += volume_score;
        frm.set_value("custom_multilocation_presence", volume_score > 0 ? 1 : 0);
        if (volume_score > 0) {
            breakdown.push(`✓ Recruitment Volume (${frm.doc.custom_recruitment_volume}): ${volume_score} pts`);
        } else {
            breakdown.push("✗ Recruitment Volume: 0 pts");
        }
    } else {
        frm.set_value("custom_multilocation_presence", 0);
        breakdown.push("✗ Recruitment Volume: Not provided");
    }

    // --- 9. Turnover (6-9 points) ---
    if (frm.doc.custom_turnover_in_inr) {
        let turnover_score = 0;
        switch (frm.doc.custom_turnover_in_inr.trim()) {
            case "50 Cr to 200 Cr": 
                turnover_score = 6; 
                break;
            case "200 and above": 
                turnover_score = 9; 
                break;
            default: 
                turnover_score = 0;
        }
        score += turnover_score;
        frm.set_value("custom_turnover_temp", turnover_score > 0 ? 1 : 0);
        if (turnover_score > 0) {
            breakdown.push(`✓ Turnover (${frm.doc.custom_turnover_in_inr}): ${turnover_score} pts`);
        } else {
            breakdown.push("✗ Turnover: 0 pts");
        }
    } else {
        frm.set_value("custom_turnover_temp", 0);
        breakdown.push("✗ Turnover: Not provided");
    }

    // --- Save Final Score ---
    frm.set_value("custom_qualification_score", score);
    
    // --- Show Real-Time Score Display ---
    display_temp_realtime_score(frm, score, breakdown);

    return score;
}

// ============================================
// REAL-TIME SCORE DISPLAY FUNCTION
// ============================================
function display_temp_realtime_score(frm, score, breakdown) {
    // Check if all mandatory checkboxes are checked
    let all_mandatory_checked = 
        frm.doc.custom_recruitment_doability_approved_temp &&
        frm.doc.custom_employment_tenure_temp &&
        frm.doc.custom_minimum_wages &&
        frm.doc.custom_compliance_scope_pfesi_etc;
    
    // Determine if lead qualifies (score >= 8 AND all mandatory checks)
    let qualifies = score >=8 && all_mandatory_checked;
    
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
                    ${icon} Temp Staffing Qualification Score
                </h4>
                <span style="
                    font-size: 24px;
                    font-weight: bold;
                    color: ${indicator_color};
                ">${score} / 70</span>
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
                ${status_text} (Minimum: 8)
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
    
    // Also show in dashboard if vertical is Temporary Staffing
    if (frm.doc.custom_vertical === "Temporary Staffing") {
        // Remove existing dashboard if any
        frm.dashboard.clear_headline();
        
        // Add score to dashboard
        frm.dashboard.set_headline_alert(
            `<div style="font-size: 14px;">
                <strong>Temp Staffing Qualification Score:</strong> 
                <span style="color: ${indicator_color}; font-weight: bold; font-size: 16px;">
                    ${score} / 70
                </span>
                <span style="margin-left: 10px; color: ${indicator_color};">
                    ${status_text}
                </span>
            </div>`,
            qualifies ? 'green' : 'red'
        );
    }
}

