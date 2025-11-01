frappe.ui.form.on("Opportunity", {
    setup: function(frm) {
        frm.selected_status_for_change = null;
    },

    refresh: (frm) => {
        const statuses = ["Introduction", "Discussion", "Proposal", "Negotiation", "Agreement", "Closed Won", "Closed Lost", "Drop"];
        const current_status = frm.doc.status;
        const current_status_index = statuses.indexOf(current_status);

        // --- MODIFIED LOGIC ---
        // Button should only hide for final terminal states
        const end_states = ["Closed Won", "Closed Lost", "Drop"];
        const show_mark_complete = !end_states.includes(current_status);

        let html = `
            <style>
                .custom-lead-header {
                    background-color: white;
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    margin-bottom: 20px;
                }
                .lead-title-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                .lead-left-section {
                    display: flex;
                    align-items: center;
                }
                .lead-icon {
                    font-size: 16px;
                    color: white;
                    background-color: #10b981;
                    padding: 8px;
                    border-radius: 4px;
                    margin-right: 12px;
                    line-height: 1;
                }
                .lead-badge {
                    background-color: #dcfce7;
                    color: #166534;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-right: 12px;
                }
                .lead-name {
                    font-size: 20px;
                    font-weight: 600;
                    color: #111827;
                }
                .lead-details-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .detail-item {
                    display: flex;
                    flex-direction: column;
                }
                .detail-label {
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 4px;
                    font-weight: 500;
                }
                .detail-value {
                    font-size: 14px;
                    color: #111827;
                    font-weight: 600;
                }
               
                .funnel-progress-container {
                    display: flex;
                    width: 100%;
                    height: 50px;
                    margin: 20px 0;
                    position: relative;
                    background: white;
                }
                
                .funnel-segment {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    flex: 1;
                    height: 100%;
                    background: #e5e7eb;
                    color: #6b7280;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-right: 2px;
                }
                
                .funnel-segment .segment-text {
                    opacity: 1;
                    transition: opacity 0.3s ease;
                }
                
                /* REMOVED checkmark and hover-related text/checkmark opacity styles */
                
                .funnel-segment:not(:last-child) {
                    clip-path: polygon(0% 0%, calc(100% - 20px) 0%, 100% 50%, calc(100% - 20px) 100%, 0% 100%, 20px 50%);
                }
                
                .funnel-segment:first-child {
                    clip-path: polygon(0% 0%, calc(100% - 20px) 0%, 100% 50%, calc(100% - 20px) 100%, 0% 100%);
                    border-radius: 6px 0 0 6px;
                }
                
                .funnel-segment:last-child {
                    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 20px 50%);
                    border-radius: 0 6px 6px 0;
                    margin-right: 0;
                }
                
                .funnel-segment.completed {
                    background: #10b981;
                    color: white;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
                }
                
                .funnel-segment.active {
                    background: #10b981;
                    color: white;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
                }
                
                .funnel-segment.final-stage {
                    background: #e5e7eb;
                    color: #6b7280;
                    border: 1px solid #d1d5db;
                }
                .funnel-segment.closed-won-active {
                    background: #10b981;
                    color: white;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
                }
                .funnel-segment.closed-lost-active,
                .funnel-segment.drop-active { /* Added drop-active here */
                    background: #ef4444;
                    color: white;
                    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
                }

                /* REMOVED all :hover styles */
                
                .mark-complete-btn {
                    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                    color: white;
                    text-align: center;
                    padding: 15px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 10px;
                    user-select: none;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
                }
                
                .mark-complete-btn:hover {
                    background: linear-gradient(135deg, #2563eb, #1e40af);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
                }
            </style>
            
            <div class="custom-lead-header">
                 <div class="lead-title-bar">
                     <div class="lead-left-section">
                         <div class="lead-icon">★</div>
                         <div class="lead-badge">Opportunity</div>
                         <div class="lead-name">${frm.doc.title || ""}</div>
                     </div>
                 </div>
                 <div class="lead-details-grid">
                      <div class="detail-item"><span class="detail-label">Account Name</span><span class="detail-value">${frm.doc.customer_name || "N/A"}</span></div>
                      <div class="detail-item"><span class="detail-label">Close Date</span><span class="detail-value">${frm.doc.transaction_date || "N/A"}</span></div>
                      <div class="detail-item"><span class="detail-label">Opportunity Owner</span><span class="detail-value">${frm.doc.opportunity_owner || "N/A"}</span></div>
                      <div class="detail-item"><span class="detail-label">Contact Number</span><span class="detail-value">${frm.doc.contact_no || "N/A"}</span></div>
                 </div>
            </div>

            <div class="funnel-progress-container">
        `;

        statuses.forEach((status, index) => {
            let segment_class = "";
            let tooltip_text = `Click to set status to ${status}`;

            // --- MODIFIED CLASS LOGIC ---
            if (index < current_status_index) {
                segment_class = "completed";
            } else if (index === current_status_index) {
                if (status === "Closed Won") {
                    segment_class = "closed-won-active";
                } else if (status === "Closed Lost") {
                    segment_class = "closed-lost-active";
                } else if (status === "Drop") {
                    segment_class = "drop-active";
                } else {
                    segment_class = "active"; // For Introduction through Agreement
                }
            } else {
                segment_class = "final-stage"; // For pending stages
            }
            
            // --- MODIFIED HTML (Checkmark removed, text always visible) ---
            html += `
                <div class="funnel-segment ${segment_class}" data-status="${status}" data-tooltip="${tooltip_text}">
                    <span class="segment-text">${status}</span>
                </div>
            `;
        });

        html += `</div>`;

        html += `<div class="actions-container" style="text-align: center;">`;
        
        // --- Use new show_mark_complete variable ---
        if (show_mark_complete) {
            html += `<div class="mark-complete-btn">✓ Mark Status as Complete</div>`;
        }
        html += `<div class="mark-complete-btn save-status-btn" style="display: none;">Save Status Change</div>`;
        html += `</div>`;

        frm.dashboard.clear_headline();
        frm.dashboard.set_headline(html);
    },

    after_save: function(frm) {
        frm.selected_status_for_change = null;
        frm.dashboard.refresh();
    }
});

// Event handlers - use namespaced events and check if already bound
if (!window._opportunity_funnel_handlers_bound) {
    window._opportunity_funnel_handlers_bound = true;
    
    $(document).on("click.opportunity_funnel", ".funnel-segment", function() {
        const clicked_status = $(this).data("status");
        const frm = cur_frm;

        if (clicked_status !== frm.doc.status) {
            frm.selected_status_for_change = clicked_status;
            $(".funnel-segment").removeClass("selected");
            $(this).addClass("selected");
            $(".save-status-btn").show();
            $(".mark-complete-btn:not(.save-status-btn)").hide();
        } else {
            frm.selected_status_for_change = null;
            $(".funnel-segment").removeClass("selected");
            $(".save-status-btn").hide();
            
            const end_states = ["Closed Won", "Closed Lost", "Drop"];
            if (!end_states.includes(frm.doc.status)) {
                 $(".mark-complete-btn:not(.save-status-btn)").show();
            }
        }
    });

    $(document).on("click.opportunity_funnel", ".save-status-btn", function() {
        const frm = cur_frm;
        if (frm.selected_status_for_change) {
            console.log("Saving status change:", frm.doc.status, "->", frm.selected_status_for_change);
            frm.set_value("status", frm.selected_status_for_change);
            frm.save();
        }
    });

    $(document).on("click.opportunity_funnel", ".mark-complete-btn:not(.save-status-btn)", function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const frm = cur_frm;
        const statuses = ["Introduction", "Discussion", "Proposal", "Negotiation", "Agreement", "Closed Won", "Closed Lost", "Drop"];
        const current_status_index = statuses.indexOf(frm.doc.status);
        const next_status_index = current_status_index + 1;

        if (next_status_index < statuses.length) {
            const current_status = frm.doc.status;
            const next_status = statuses[next_status_index];
            
            // Validate required attachments before advancing
            if (current_status === "Proposal" && !frm.doc.custom_proposal_document) {
                frappe.msgprint({
                    title: __("Missing Attachment"),
                    indicator: "red",
                    message: __("Please attach Proposal Document before advancing to Negotiation stage.")
                });
                return;
            }
            
            if (current_status === "Agreement" && !frm.doc.custom_agreement_attachment) {
                frappe.msgprint({
                    title: __("Missing Attachment"),
                    indicator: "red",
                    message: __("Please attach Agreement Attachment before advancing to the next stage.")
                });
                return;
            }
            
            console.log("Mark Complete:", current_status, "->", next_status);
            frm.set_value("status", next_status);
            frm.save();
        }
    });
}

