import frappe


def create_dashboard_components():
	"""Create CRM Dashboard with all charts and number cards"""

	# Create Number Cards
	number_cards = [
		{
			"name": "Total Leads",
			"label": "Total Leads",
			"function": "Sum",
			"aggregate_function_based_on": "name",
			"doctype_name": "Lead",
			"document_type": "Lead",
			"report_function": "Count",
			"is_public": 1,
			"show_percentage_stats": 1,
			"stats_time_interval": "Monthly",
			"module": "CRM PP",
		},
		{
			"name": "Total Opportunities",
			"label": "Total Opportunities",
			"function": "Sum",
			"aggregate_function_based_on": "name",
			"doctype_name": "Opportunity",
			"document_type": "Opportunity",
			"report_function": "Count",
			"is_public": 1,
			"show_percentage_stats": 1,
			"stats_time_interval": "Monthly",
			"module": "CRM PP",
		},
		{
			"name": "Conversion Rate",
			"label": "Conversion Rate (%)",
			"function": "Sum",
			"document_type": "Lead",
			"aggregate_function_based_on": "name",
			"method": "crm_pp.crm_pp.dashboard.get_conversion_rate",
			"is_public": 1,
			"show_percentage_stats": 0,
			"module": "CRM PP",
		},
		{
			"name": "Total Opportunity Value",
			"label": "Total Opportunity Value",
			"function": "Sum",
			"aggregate_function_based_on": "opportunity_amount",
			"doctype_name": "Opportunity",
			"document_type": "Opportunity",
			"report_function": "Sum",
			"is_public": 1,
			"show_percentage_stats": 1,
			"stats_time_interval": "Monthly",
			"module": "CRM PP",
		},
		{
			"name": "Won Opportunities",
			"label": "Won Opportunities",
			"function": "Sum",
			"aggregate_function_based_on": "name",
			"doctype_name": "Opportunity",
			"document_type": "Opportunity",
			"report_function": "Count",
			"filters_json": '[["Opportunity","status","=","Converted"]]',
			"is_public": 1,
			"show_percentage_stats": 1,
			"stats_time_interval": "Monthly",
			"module": "CRM PP",
		},
		{
			"name": "Won Opportunity Value",
			"label": "Won Opportunity Value",
			"function": "Sum",
			"aggregate_function_based_on": "opportunity_amount",
			"doctype_name": "Opportunity",
			"document_type": "Opportunity",
			"report_function": "Sum",
			"filters_json": '[["Opportunity","status","=","Converted"]]',
			"is_public": 1,
			"show_percentage_stats": 1,
			"stats_time_interval": "Monthly",
			"module": "CRM PP",
		},
		{
			"name": "Total Sales Value",
			"label": "Total Sales Value",
			"function": "Sum",
			"aggregate_function_based_on": "grand_total",
			"doctype_name": "Sales Invoice",
			"document_type": "Sales Invoice",
			"report_function": "Sum",
			"filters_json": '[["Sales Invoice","docstatus","=",1]]',
			"is_public": 1,
			"show_percentage_stats": 1,
			"stats_time_interval": "Monthly",
			"module": "CRM PP",
		},
		{
			"name": "Payment Received",
			"label": "Payment Received",
			"function": "Sum",
			"aggregate_function_based_on": "paid_amount",
			"doctype_name": "Payment Entry",
			"document_type": "Payment Entry",
			"report_function": "Sum",
			"filters_json": '[["Payment Entry","docstatus","=",1],["Payment Entry","payment_type","=","Receive"]]',
			"is_public": 1,
			"show_percentage_stats": 1,
			"stats_time_interval": "Monthly",
			"module": "CRM PP",
		},
		{
			"name": "Outstanding Invoices",
			"label": "Outstanding Invoices",
			"function": "Sum",
			"aggregate_function_based_on": "outstanding_amount",
			"doctype_name": "Sales Invoice",
			"document_type": "Sales Invoice",
			"report_function": "Sum",
			"filters_json": '[["Sales Invoice","docstatus","=",1],["Sales Invoice","outstanding_amount",">",0]]',
			"is_public": 1,
			"show_percentage_stats": 0,
			"module": "CRM PP",
		},
		{
			"name": "Collection Efficiency",
			"label": "Collection Efficiency (%)",
			"function": "Sum",
			"document_type": "Sales Invoice",
			"aggregate_function_based_on": "grand_total",
			"method": "crm_pp.crm_pp.dashboard.get_collection_efficiency",
			"is_public": 1,
			"show_percentage_stats": 0,
			"module": "CRM PP",
		},
	]

	print("Creating Number Cards...")
	for card_data in number_cards:
		if not frappe.db.exists("Number Card", card_data["name"]):
			try:
				card = frappe.get_doc({"doctype": "Number Card", **card_data})
				card.insert(ignore_permissions=True)
				print(f"✓ Created Number Card: {card_data['name']}")
			except Exception as e:
				print(f"✗ Error creating {card_data['name']}: {str(e)}")
		else:
			print(f"- Number Card already exists: {card_data['name']}")

	# Create Dashboard Charts
	dashboard_charts = [
		{
			"name": "Leads by State",
			"chart_name": "Leads by State",
			"chart_type": "Group By",
			"document_type": "Lead",
			"group_by_type": "Count",
			"group_by_based_on": "status",
			"is_public": 1,
			"module": "CRM PP",
			"type": "Donut",
			"filters_json": "[]",
		},
		{
			"name": "Opportunities by Vertical",
			"chart_name": "Opportunities by Vertical",
			"chart_type": "Group By",
			"document_type": "Opportunity",
			"group_by_type": "Count",
			"group_by_based_on": "custom_vertical",
			"is_public": 1,
			"module": "CRM PP",
			"type": "Bar",
			"filters_json": "[]",
		},
		{
			"name": "Top Customers by Opportunity Value",
			"chart_name": "Top Customers by Opportunity Value",
			"chart_type": "Sum",
			"document_type": "Opportunity",
			"based_on": "party_name",
			"value_based_on": "opportunity_amount",
			"number_of_groups": 10,
			"is_public": 1,
			"module": "CRM PP",
			"type": "Bar",
			"filters_json": "[]",
		},
		{
			"name": "Leads by Source",
			"chart_name": "Leads by Source",
			"chart_type": "Group By",
			"document_type": "Lead",
			"group_by_type": "Count",
			"group_by_based_on": "source",
			"is_public": 1,
			"module": "CRM PP",
			"type": "Donut",
			"filters_json": "[]",
		},
		{
			"name": "Opportunities by Status",
			"chart_name": "Opportunities by Status",
			"chart_type": "Sum",
			"document_type": "Opportunity",
			"based_on": "status",
			"value_based_on": "opportunity_amount",
			"is_public": 1,
			"module": "CRM PP",
			"type": "Bar",
			"filters_json": "[]",
		},
		{
			"name": "Payment Collection Trend",
			"chart_name": "Payment Collection Trend",
			"chart_type": "Sum",
			"document_type": "Payment Entry",
			"based_on": "posting_date",
			"value_based_on": "paid_amount",
			"timeseries": 1,
			"time_interval": "Monthly",
			"timespan": "Last Year",
			"filters_json": '[["Payment Entry","payment_type","=","Receive"],["Payment Entry","docstatus","=",1]]',
			"is_public": 1,
			"module": "CRM PP",
			"type": "Line",
		},
		{
			"name": "Outstanding by Customer",
			"chart_name": "Outstanding by Customer",
			"chart_type": "Sum",
			"document_type": "Sales Invoice",
			"based_on": "customer",
			"value_based_on": "outstanding_amount",
			"number_of_groups": 10,
			"filters_json": '[["Sales Invoice","docstatus","=",1],["Sales Invoice","outstanding_amount",">",0]]',
			"is_public": 1,
			"module": "CRM PP",
			"type": "Bar",
		},
		{
			"name": "Customer Revenue Distribution",
			"chart_name": "Customer Revenue Distribution",
			"chart_type": "Sum",
			"document_type": "Sales Invoice",
			"based_on": "customer",
			"value_based_on": "grand_total",
			"number_of_groups": 15,
			"filters_json": '[["Sales Invoice","docstatus","=",1]]',
			"is_public": 1,
			"module": "CRM PP",
			"type": "Bar",
		},
	]

	print("\nCreating Dashboard Charts...")
	for chart_data in dashboard_charts:
		if not frappe.db.exists("Dashboard Chart", chart_data["name"]):
			try:
				chart = frappe.get_doc({"doctype": "Dashboard Chart", **chart_data})
				chart.insert(ignore_permissions=True)
				print(f"✓ Created Dashboard Chart: {chart_data['name']}")
			except Exception as e:
				print(f"✗ Error creating {chart_data['name']}: {str(e)}")
		else:
			print(f"- Dashboard Chart already exists: {chart_data['name']}")

	# Create Dashboard
	if not frappe.db.exists("Dashboard", "CRM Dashboard"):
		try:
			dashboard = frappe.get_doc(
				{
					"doctype": "Dashboard",
					"dashboard_name": "CRM Dashboard",
					"module": "CRM PP",
					"is_standard": 0,
					"is_default": 0,
					"cards": [
						{"card": "Total Leads"},
						{"card": "Total Opportunities"},
						{"card": "Conversion Rate"},
						{"card": "Total Opportunity Value"},
						{"card": "Won Opportunities"},
						{"card": "Won Opportunity Value"},
						{"card": "Total Sales Value"},
						{"card": "Payment Received"},
						{"card": "Outstanding Invoices"},
						{"card": "Collection Efficiency"},
					],
					"charts": [
						{"chart": "Leads by State", "width": "Half"},
						{"chart": "Opportunities by Vertical", "width": "Half"},
						{"chart": "Top Customers by Opportunity Value", "width": "Half"},
						{"chart": "Leads by Source", "width": "Half"},
						{"chart": "Opportunities by Status", "width": "Full"},
						{"chart": "Payment Collection Trend", "width": "Half"},
						{"chart": "Outstanding by Customer", "width": "Half"},
						{"chart": "Customer Revenue Distribution", "width": "Full"},
					],
				}
			)
			dashboard.insert(ignore_permissions=True)
			print(f"\n✓ Created Dashboard: CRM Dashboard")
		except Exception as e:
			print(f"\n✗ Error creating Dashboard: {str(e)}")
	else:
		print("\n- Dashboard already exists: CRM Dashboard")

	frappe.db.commit()
	print("\n✅ All dashboard components created successfully!")

