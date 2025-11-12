import Widget from "./base_widget.js";

frappe.provide("frappe.widget.utils");
frappe.provide("frappe.dashboards");
frappe.provide("frappe.dashboards.chart_sources");

// ---------------------------------------------------------------------------
// crm_pp/public/js/chart_widget.js
// ---------------------------------------------------------------------------
// Global helper to make charts clickable and route to filtered list views.
// Supports Chart.js and frappe.Chart (billboard.js) instances.
// ---------------------------------------------------------------------------
(function () {
	// Utility: normalize raw label values into sensible filter inputs.
	function normalizeLabel(label) {
		if (label === null || label === undefined) return "";
		label = String(label).trim();
		if (/^null$/i.test(label)) return "";
		if (label === "—" || label === "-") return "";
		return label;
	}

	// Internal helper: final route trigger.
	function openListView(doctype, filters) {
		frappe.route_options = filters;
		frappe.set_route("List", doctype);
	}

	// Common payload handler invoked by each chart adapter.
	function handleChartClickPayload(label, value, config) {
		if (!config || !config.doctype || !config.field) {
			console.error("handleChartClickPayload: invalid config", config);
			return;
		}

		let filterVal = label;
		if (config.valueTransform && typeof config.valueTransform === "function") {
			try {
				filterVal = config.valueTransform(label, value);
			} catch (e) {
				console.error("valueTransform error", e);
				filterVal = label;
			}
		} else {
			filterVal = normalizeLabel(label);
		}

		let filters;
		if (filterVal === "" && config.allow_null_as_blank) {
			filters = { [config.field]: "" };
		} else if (filterVal === "" && config.null_to_is_null) {
			filters = { filters: [[config.doctype, config.field, "=", ""]] };
		} else {
			filters = { [config.field]: filterVal };
		}

		if (config.extraFilters && typeof config.extraFilters === "function") {
			try {
				const extra = config.extraFilters(label, value);
				if (extra && typeof extra === "object") {
					if (filters.filters && Array.isArray(filters.filters)) {
						filters.filters.push(...(extra.filters || []));
					} else if (extra.filters) {
						filters.filters = extra.filters;
					}
					Object.assign(filters, extra.routeOptions || {});
				}
			} catch (e) {
				console.warn("extraFilters error", e);
			}
		}

		console.info("Chart click -> open list", config.doctype, filters);
		openListView(config.doctype, filters);
	}

	function attachChartjsClick(chartInstance, config) {
		const canvas = chartInstance.canvas || (chartInstance.chart && chartInstance.chart.canvas);
		if (!canvas) {
			console.warn("attachChartjsClick: canvas not found for chartInstance", chartInstance);
			return;
		}

		const listenerKey = "__crm_pp_chartjs_click_listener__";
		if (canvas[listenerKey]) {
			return;
		}

		const handler = function (evt) {
			let elements = [];
			try {
				if (typeof chartInstance.getElementsAtEventForMode === "function") {
					elements = chartInstance.getElementsAtEventForMode(
						evt,
						"nearest",
						{ intersect: true },
						true
					);
				} else if (
					chartInstance.chart &&
					typeof chartInstance.chart.getElementsAtEventForMode === "function"
				) {
					elements = chartInstance.chart.getElementsAtEventForMode(
						evt,
						"nearest",
						{ intersect: true },
						true
					);
				} else if (typeof chartInstance.getElementsAtEvent === "function") {
					elements = chartInstance.getElementsAtEvent(evt);
				}
			} catch (e) {
				console.error("attachChartjsClick: error reading elements", e);
			}

			if (!elements || !elements.length) return;

			const el = elements[0];
			const datasetIndex =
				el.datasetIndex !== undefined ? el.datasetIndex : el._datasetIndex;
			const index = el.index !== undefined ? el.index : el._index;

			let label = "";
			if (
				chartInstance.data &&
				Array.isArray(chartInstance.data.labels) &&
				chartInstance.data.labels[index] !== undefined
			) {
				label = chartInstance.data.labels[index];
			} else if (
				chartInstance.data &&
				Array.isArray(chartInstance.data.datasets) &&
				chartInstance.data.datasets[datasetIndex] &&
				chartInstance.data.datasets[datasetIndex].label
			) {
				label = chartInstance.data.datasets[datasetIndex].label;
			}

			let value = null;
			try {
				value = chartInstance.data.datasets[datasetIndex].data[index];
			} catch (e) {
				value = null;
			}

			handleChartClickPayload(label, value, config);
		};

		canvas.addEventListener("click", handler);
		canvas[listenerKey] = handler;
	}

	function attachBillboardClick(billboardChart, config) {
		const internal = billboardChart.chart || billboardChart;
		if (!internal) {
			console.warn("attachBillboardClick: billboardChart has no internal chart", billboardChart);
		}

		const listenerKey = "__crm_pp_billboard_click_listener__";
		if (internal && internal[listenerKey]) {
			return;
		}

		let attached = false;
		try {
			if (internal && typeof internal.onclick === "function") {
				const oldOnClick = internal.onclick.bind(internal);
				internal.onclick = function (d, element) {
					let label = null;
					let value = null;

					if (d) {
						if (d.id !== undefined) label = d.id;
						if (d.name !== undefined) label = d.name;
						if (d.x !== undefined) label = d.x;
						if (d.value !== undefined) value = d.value;
						if (d.y !== undefined && value === null) value = d.y;
					}

					handleChartClickPayload(label, value, config);

					try {
						oldOnClick(d, element);
					} catch (e) {
						console.warn("attachBillboardClick: original onclick error", e);
					}
				};
				internal[listenerKey] = true;
				attached = true;
			} else if (internal && typeof internal.on === "function") {
				internal.on("click", (d) => {
					let label = d?.id ?? d?.name ?? d?.x ?? null;
					let value = d?.value ?? d?.y ?? null;
					handleChartClickPayload(label, value, config);
				});
				internal[listenerKey] = true;
				attached = true;
			}
		} catch (e) {
			console.warn("attachBillboardClick: failed to attach via internal onclick", e);
		}

		if (attached) {
			return;
		}

		try {
			const container =
				billboardChart.$el ||
				billboardChart.element ||
				(internal && (internal.$el || internal.element));
			if (container && !container[listenerKey]) {
				const handler = (evt) => {
					let clickedText =
						(evt.target && evt.target.textContent) ||
						(evt.target && evt.target.getAttribute && evt.target.getAttribute("data-id"));
					if (clickedText) {
						handleChartClickPayload(clickedText, null, config);
					}
				};
				container.addEventListener("click", handler);
				container[listenerKey] = handler;
			}
		} catch (e) {
			console.warn("attachBillboardClick: fallback failed", e);
		}
	}

	function makeChartClickable(chartObj, config) {
		if (!chartObj || !config || !config.doctype || !config.field) {
			console.error("makeChartClickable: missing chartObj/config", chartObj, config);
			return;
		}

		try {
			if (
				chartObj instanceof Object &&
				(chartObj.config || chartObj.data) &&
				(chartObj.canvas || (chartObj.chart && chartObj.chart.canvas))
			) {
				attachChartjsClick(chartObj, config);
				console.log(
					"makeChartClickable: Chart.js handler attached for",
					config.doctype,
					config.field
				);
				return;
			}
		} catch (e) {
			console.warn("makeChartClickable: Chart.js detection failed", e);
		}

		try {
			if (chartObj.chart || chartObj.$el || chartObj.element) {
				attachBillboardClick(chartObj, config);
				console.log(
					"makeChartClickable: frappe.Chart/billboard handler attached for",
					config.doctype,
					config.field
				);
				return;
			}
		} catch (e) {
			console.warn("makeChartClickable: billboard detection failed", e);
		}

		if (config.selector) {
			const el = document.querySelector(config.selector);
			if (el) {
				const listenerKey = "__crm_pp_selector_click_listener__";
				if (!el[listenerKey]) {
					const handler = (evt) => {
						const txt =
							evt?.target?.textContent ??
							(evt?.target?.getAttribute && evt.target.getAttribute("data-label"));
						if (txt) {
							handleChartClickPayload(txt.trim(), null, config);
						}
					};
					el.addEventListener("click", handler);
					el[listenerKey] = handler;
					console.log("makeChartClickable: fallback handler attached to", config.selector);
				}
				return;
			}
		}

		console.error("makeChartClickable: unsupported chart instance", chartObj, config);
	}

	window.crm_pp = window.crm_pp || {};
	window.crm_pp.makeChartClickable = makeChartClickable;
	const leadsByVerticalConfig = {
		doctype: "Lead",
		field: "vertical",
		valueTransform(label) {
			return normalizeLabel(label);
		},
		selector: "#leads-by-vertical-chart",
		allow_null_as_blank: false,
		null_to_is_null: true,
	};

	const opportunitiesByVerticalConfig = {
		doctype: "Opportunity",
		field: "vertical",
		valueTransform(label) {
			return normalizeLabel(label);
		},
		selector: "#opportunities-by-vertical-chart",
		allow_null_as_blank: false,
		null_to_is_null: true,
	};

	window.crm_pp.clickableChartConfigs = Object.assign(
		{
			leads_by_vertical: leadsByVerticalConfig,
			"Leads by Vertical": leadsByVerticalConfig,
			opportunities_by_vertical: opportunitiesByVerticalConfig,
			"Opportunities by Vertical": opportunitiesByVerticalConfig,
		},
		window.crm_pp.clickableChartConfigs || {}
	);

	/*
	Example usage:
	const chartInstance = new Chart(ctx, {...});
	window.crm_pp.makeChartClickable(
		chartInstance,
		window.crm_pp.clickableChartConfigs.leads_by_vertical
	);

	const frappeChart = new frappe.Chart({...});
	window.crm_pp.makeChartClickable(
		frappeChart,
		window.crm_pp.clickableChartConfigs.opportunities_by_vertical
	);
	*/

	/*
	Manual Testing Checklist:
	- Click bar on Leads by Vertical → expect Lead List with matching filter.
	- Click pie slice on Opportunities chart → expect Opportunity List filtered.
	- Click segment labelled "null" or blank → expect blank/IS NULL filter per config.
	- Verify no console errors on dashboard load.
	- Confirm behaviour in both Chart.js and frappe.Chart contexts.
	- Click legend items or non-data areas → ensure no unexpected errors.
	*/
})();

export default class ChartWidget extends Widget {
	constructor(opts) {
		opts.shadow = true;
		super(opts);
		this.height = this.height || 240;
		// Initialize clicked_data_point to store info about a clicked chart segment
		this.clicked_data_point = null;
	}

	get_config() {
		return {
			name: this.name,
			chart_name: this.chart_name,
			label: this.label,
			hidden: this.hidden,
			width: this.width,
		};
	}

	refresh() {
		delete this.dashboard_chart;
		this.set_body();
		this.make_chart();
	}

	set_chart_title() {
		const max_chars = this.widget.width() < 600 ? 40 : 60;
		this.set_title(max_chars);
	}

	set_body() {
		this.widget.addClass("dashboard-widget-box");
		if (this.width == "Full") {
			this.widget.addClass("full-width");
		}
	}

	setup_container() {
		this.body.empty();

		if (this.chart_doc.type == "Heatmap") {
			this.setup_heatmap_container();
		}

		this.loading = $(
			`<div class="chart-loading-state text-muted" style="height: ${this.height}px;">${__(
				"Loading..."
			)}</div>`
		);
		this.loading.appendTo(this.body);

		this.empty = $(
			`<div class="chart-loading-state text-muted" style="height: ${this.height}px;">${__(
				"No Data"
			)}</div>`
		);
		this.empty.hide().appendTo(this.body);

		this.chart_wrapper = $(`<div></div>`);
		this.chart_wrapper.appendTo(this.body);

		this.$heatmap_legend = null;
		this.set_chart_title();
	}

	setup_heatmap_container() {
		this.widget.addClass("heatmap-chart");
		this.widget.removeClass("full-width").addClass("full-width");
		this.width = "Full";
	}

	set_summary() {
		if (!this.$summary) {
			this.$summary = $(`<div class="report-summary"></div>`).hide();
			this.head.after(this.$summary);
		} else {
			this.$summary.empty();
		}

		this.summary.forEach((summary) => {
			frappe.utils.build_summary_item(summary).appendTo(this.$summary);
		});
		this.summary.length && this.$summary.show();
	}

	make_chart() {
		this.get_settings().then(() => {
			if (!this.settings) {
				this.deleted = true;
				this.widget.remove();
				return;
			}

			if (!this.chart_settings) {
				this.chart_settings = {};
			}
			this.setup_container();
			if (!this.in_customize_mode) {
				this.action_area.empty();
				this.prepare_chart_actions();

				if (this.chart_doc.timeseries) {
					this.render_time_series_filters();
				}
			}
			frappe.run_serially([
				() => this.prepare_chart_object(),
				() => this.setup_filter_button(),
				() => this.fetch_and_update_chart(),
			]);
		});
	}

	render_time_series_filters() {
		let filters = this.get_time_series_filters();
		frappe.dashboard_utils.render_chart_filters(filters, "chart-actions", this.action_area, 0);
	}

	get_time_series_filters() {
		let filters;
		if (this.chart_doc.type == "Heatmap") {
			filters = [
				{
					label: __(this.chart_settings.heatmap_year) || __(this.chart_doc.heatmap_year),
					options: frappe.dashboard_utils.get_years_since_creation(
						frappe.boot.user.creation
					),
					action: (selected_item) => {
						this.selected_heatmap_year = selected_item;
						this.save_chart_config_for_user({
							heatmap_year: this.selected_heatmap_year,
						});
						this.fetch_and_update_chart();
					},
				},
			];
		} else {
			filters = [
				{
					label:
						__(this.chart_settings.time_interval) || __(this.chart_doc.time_interval),
					options: ["Yearly", "Quarterly", "Monthly", "Weekly", "Daily"],
					icon: "calendar",
					class: "time-interval-filter",
					action: (selected_item) => {
						this.selected_time_interval = selected_item;
						this.save_chart_config_for_user({
							time_interval: this.selected_time_interval,
						});
						this.fetch_and_update_chart();
					},
				},
				{
					label: __(this.chart_settings.timespan) || __(this.chart_doc.timespan),
					options: [
						"Select Date Range",
						"Last Year",
						"Last Quarter",
						"Last Month",
						"Last Week",
					],
					class: "timespan-filter",
					action: (selected_item) => {
						this.selected_timespan = selected_item;

						if (this.selected_timespan === "Select Date Range") {
							this.render_date_range_field();
						} else {
							this.selected_from_date = null;
							this.selected_to_date = null;
							if (this.date_field_wrapper) {
								this.date_field_wrapper.hide();

								// Title maybe hidden becuase of date range fields
								// in half width chart
								this.title_field.show();
								this.subtitle_field.show();
								this.head.css("flex-direction", "row");
							}

							this.save_chart_config_for_user({
								timespan: this.selected_timespan,
								from_date: null,
								to_date: null,
							});
							this.fetch_and_update_chart();
						}
					},
				},
			];
		}
		return filters;
	}

	fetch_and_update_chart() {
		this.args = {
			timespan: this.selected_timespan || this.chart_settings.timespan,
			time_interval: this.selected_time_interval || this.chart_settings.time_interval,
			from_date: this.selected_from_date || this.chart_settings.from_date,
			to_date: this.selected_to_date || this.chart_settings.to_date,
			heatmap_year: this.selected_heatmap_year || this.chart_settings.heatmap_year,
		};

		this.fetch(this.filters, true, this.args).then((data) => {
			if (this.chart_doc.chart_type == "Report") {
				this.report_result = data;
				this.summary = data.report_summary;
				data = this.get_report_chart_data(data);
			}

			this.update_chart_object();
			this.data = data;
			this.render();
		});
	}

	render_date_range_field() {
		if (!this.date_field_wrapper || !this.date_field_wrapper.is(":visible")) {
			this.date_field_wrapper = $(
				`<div class="dashboard-date-field pull-right"></div>`
			).insertAfter(this.action_area.find(".timespan-filter"));

			if (this.width !== "Full" && this.widget.width() < 700) {
				this.title_field.hide();
				this.subtitle_field.hide();
				this.head.css("flex-direction", "row-reverse");
			}

			this.date_range_field = frappe.ui.form.make_control({
				df: {
					fieldtype: "DateRange",
					fieldname: "from_date",
					placeholder: __("Date Range"),
					input_class: "input-xs",
					default: [this.chart_settings.from_date, this.chart_settings.to_date],
					value: [this.chart_settings.from_date, this.chart_settings.to_date],
					reqd: 1,
					change: () => {
						let selected_date_range = this.date_range_field.get_value();
						this.selected_from_date = selected_date_range[0];
						this.selected_to_date = selected_date_range[1];

						if (selected_date_range && selected_date_range.length == 2) {
							this.save_chart_config_for_user({
								timespan: this.selected_timespan,
								from_date: this.selected_from_date,
								to_date: this.selected_to_date,
							});
							this.fetch_and_update_chart();
						}
					},
				},
				parent: this.date_field_wrapper,
				render_input: 1,
			});

			this.date_range_field.$input.focus();
		}
	}

	get_report_chart_data(result) {
		if (result.chart && this.chart_doc.use_report_chart) {
			return result.chart.data;
		} else {
			let y_fields = [];
			this.chart_doc.y_axis.map((field) => {
				y_fields.push(field.y_field);
			});

			let chart_fields = {
				y_fields: y_fields,
				x_field: this.chart_doc.x_field,
				chart_type: this.chart_doc.type,
				color: this.chart_doc.color,
			};
			let columns = result.columns.map((col) => {
				return frappe.report_utils.prepare_field_from_column(col);
			});

			return frappe.report_utils.make_chart_options(columns, result, chart_fields).data;
		}
	}

	prepare_chart_actions() {
		let actions = [
			{
				label: __("Refresh"),
				action: "action-refresh",
				handler: () => {
					delete this.dashboard_chart;
					this.make_chart();
				},
			},
			{
				label: __("Edit"),
				action: "action-edit",
				handler: () => {
					frappe.set_route("Form", "Dashboard Chart", this.chart_doc.name);
				},
			},
			{
				label: __("Reset Chart"),
				action: "action-reset",
				handler: () => {
					this.reset_chart();
					delete this.dashboard_chart;
					this.make_chart();
				},
			},
		];

		if (this.chart_doc.document_type) {
			actions.push({
				label: __("{0} List", [__(this.chart_doc.document_type)]),
				action: "action-list",
				handler: () => {
					frappe.set_route("List", this.chart_doc.document_type);
				},
			});
		} else if (this.chart_doc.chart_type === "Report") {
			actions.push({
				label: __("{0} Report", [__(this.chart_doc.report_name)]),
				action: "action-list",
				handler: () => {
					frappe.set_route("query-report", this.chart_doc.report_name, this.filters);
				},
			});
		}
		this.set_chart_actions(actions);
	}

	setup_filter_button() {
		if (this.in_customize_mode) return;

		this.is_document_type =
			this.chart_doc.chart_type !== "Report" && this.chart_doc.chart_type !== "Custom";

		this.filter_button = $(
			`<div class="filter-chart btn btn-xs pull-right">
				${frappe.utils.icon("filter", "sm")}
			</div>`
		);

		this.filter_button.appendTo(this.action_area);

		if (this.is_document_type) {
			if (this.filter_group) {
				this.filters = this.filter_group.get_filters();
			}
			this.create_filter_group_and_add_filters();
		} else {
			this.filter_button.on("click", () => {
				let fields;

				frappe.dashboard_utils
					.get_filters_for_chart_type(this.chart_doc)
					.then((filters) => {
						if (!this.is_document_type) {
							fields = (filters || [])
								.filter((df) => df.fieldname)
								.map((df) => {
									Object.assign(df, df.dashboard_config || {});
									return df;
								});
						} else {
							fields = [
								{
									fieldtype: "HTML",
									fieldname: "filter_area",
								},
							];
						}

						this.setup_filter_dialog(fields);
					});
			});
		}
	}

	setup_filter_dialog(fields) {
		let me = this;
		let dialog = new frappe.ui.Dialog({
			title: __("Set Filters for {0}", [__(this.chart_doc.chart_name)]),
			fields: fields,
			primary_action: function () {
				let values = this.get_values();
				if (values) {
					this.hide();
					me.filters = values;
					me.save_chart_config_for_user({ filters: me.filters });
					me.fetch_and_update_chart();
				}
			},
			primary_action_label: __("Set"),
		});

		dialog.show();

		if (this.chart_doc.chart_type == "Report") {
			//Set query report object so that it can be used while fetching filter values in the report
			frappe.query_report = new frappe.views.QueryReport({ filters: dialog.fields_list });
			frappe.query_reports[this.chart_doc.report_name].onload &&
				frappe.query_reports[this.chart_doc.report_name].onload(frappe.query_report);
		}
		dialog.set_values(this.filters);
	}

	reset_chart() {
		this.save_chart_config_for_user(null, 1);
		this.chart_settings = {};
		this.filters = null;
		this.selected_time_interval = null;
		this.selected_timespan = null;
		this.selected_heatmap_year = null;
	}

	save_chart_config_for_user(config, reset = 0) {
		Object.assign(this.chart_settings, config);
		frappe.xcall(
			"frappe.desk.doctype.dashboard_settings.dashboard_settings.save_chart_config",
			{
				reset: reset,
				config: this.chart_settings,
				chart_name: this.chart_doc.chart_name,
			}
		);
	}

	create_filter_group_and_add_filters() {
		this.filter_group = new frappe.ui.FilterGroup({
			doctype: this.chart_doc.document_type,
			parent_doctype: this.chart_doc.parent_document_type,
			filter_button: this.filter_button,
			on_change: () => {
				this.filters = this.filter_group.get_filters();
				this.save_chart_config_for_user({
					filters: this.filters,
				});
				this.fetch_and_update_chart();
			},
		});

		this.filters &&
			frappe.model.with_doctype(this.chart_doc.document_type, () => {
				this.filter_group.add_filters_to_filter_group(this.filters);
			});
	}

	set_chart_actions(actions) {
		this.chart_actions = $(`<div class="chart-actions dropdown pull-right">
			<button data-toggle="dropdown"
				aria-haspopup="true"aria-expanded="false"
				class="btn btn-xs btn-secondary chart-menu"
			>
				<svg class="icon icon-sm">
					<use href="#icon-dot-horizontal">
					</use>
				</svg>
			</button>
			<ul class="dropdown-menu dropdown-menu-right">
				${actions
					.map(
						(action) =>
							`<li><a class="dropdown-item" data-action="${action.action}">${__(
								action.label
							)}</a></li>`
					)
					.join("")}
			</ul>
		</div>
		`);
		/* eslint-enable indent */

		this.chart_actions.find("a[data-action]").each((i, o) => {
			const action = o.dataset.action;
			$(o).click(actions.find((a) => a.action === action));
		});
		this.chart_actions.appendTo(this.action_area);
	}

	fetch(filters, refresh = false, args) {
		let method = this.settings.method;

		if (this.chart_doc.chart_type == "Report") {
			args = {
				report_name: this.chart_doc.report_name,
				filters: filters,
				ignore_prepared_report: 1,
			};
		} else {
			args = {
				chart_name: this.chart_doc.name,
				filters: filters,
				refresh: refresh ? 1 : 0,
				time_interval: args && args.time_interval ? args.time_interval : null,
				timespan: args && args.timespan ? args.timespan : null,
				from_date: args && args.from_date ? args.from_date : null,
				to_date: args && args.to_date ? args.to_date : null,
				heatmap_year: args && args.heatmap_year ? args.heatmap_year : null,
			};
		}
		return frappe.xcall(method, args);
	}

	async get_source_doctype() {
		if (this.chart_doc.document_type) {
			return this.chart_doc.document_type;
		}
		if (this.chart_doc.chart_type == "Report" && this.chart_doc.report_name) {
			return await frappe.db
				.get_value("Report", this.chart_doc.report_name, "ref_doctype")
				.then((r) => r.message.ref_doctype);
		}
	}

	async render() {
		let setup_dashboard_chart = () => {
			const chart_args = this.get_chart_args();

			if (!this.dashboard_chart) {
				this.dashboard_chart = frappe.utils.make_chart(this.chart_wrapper[0], chart_args);
				this.apply_clickable_chart(this.dashboard_chart);
			} else {
				this.dashboard_chart.update(this.data);
				this.apply_clickable_chart(this.dashboard_chart);
			}
            // Ensure events are set AFTER the chart is initialized/updated
            this.set_events();
		};

		if (!this.data || !this.data.labels || !Object.keys(this.data).length) {
			this.chart_wrapper.hide();
			this.loading.hide();
			this.$summary && this.$summary.hide();
			this.empty.show();
		} else {
			this.loading.hide();
			this.empty.hide();
			this.chart_wrapper.show();
			this.chart_doc.document_type = await this.get_source_doctype();

			if (this.chart_doc.document_type) {
				frappe.model.with_doctype(this.chart_doc.document_type, setup_dashboard_chart);
			} else {
				setup_dashboard_chart();
			}

			this.width == "Full" && this.summary && this.set_summary();
			this.chart_doc.type == "Heatmap" && this.render_heatmap_legend();
		}
	}

	// This method is directly taken from NumberCardWidget, adapted for ChartWidget's properties
	set_events() {
		const clickableConfig = this.get_clickable_chart_config();

		if (clickableConfig && window.crm_pp?.makeChartClickable) {
			// Handler already applied via apply_clickable_chart, so skip custom fallback.
			return;
		}

		if (this.dashboard_chart && typeof this.dashboard_chart.on === "function") {
			this.dashboard_chart.on("click", (params) => {
				if (this.in_customize_mode) return;
				this.clicked_data_point = {
					label: params?.name || params?.label,
					value: params?.value,
				};
				this.set_route();
			});
			console.log("Chart click event listener attached via default handler.");
		} else {
			console.warn(
				"Could not attach specific data point click handler. `this.dashboard_chart.on` not found."
			);
			$(this.body)
				.off("click.crm_pp_chart")
				.on("click.crm_pp_chart", () => {
					if (this.in_customize_mode) return;
					this.clicked_data_point = null;
					console.log("General chart area clicked, routing to full list.");
					this.set_route();
				});
		}
	}

	// This method is directly taken from NumberCardWidget, adapted for ChartWidget's properties
	set_route() {
		if (this.in_customize_mode) return;

		// Prioritize specific data point click if available
		const clickedLabel = this.clicked_data_point?.label; // e.g., "Unqualified"
		const clickedValue = this.clicked_data_point?.value; // e.g., 64 (value might not be strictly needed for filtering)

		// Reset clicked_data_point after use to prevent it from affecting subsequent navigations
		this.clicked_data_point = null;

		if (this.chart_doc.chart_type === "Custom") {
			let custom_chart_options;
			try {
				if (this.chart_doc.custom_options) {
					custom_chart_options = JSON.parse(this.chart_doc.custom_options);
				}
			} catch (e) {
				console.warn("Invalid JSON in custom_options for chart:", this.chart_doc.name, e);
			}

			if (custom_chart_options?.route) {
				frappe.route_options = custom_chart_options.route_options || {};
				if (clickedLabel) {
					// Pass the clicked label as a route option for custom charts if needed
					frappe.route_options.clicked_label = clickedLabel;
					frappe.route_options.clicked_value = clickedValue;
				}
				frappe.set_route(custom_chart_options.route);
				return;
			}
			// If no custom route, do nothing for custom charts
			return;
		}

		// Determine if it's a document type or a report
		const is_document_type = this.chart_doc.chart_type !== "Report";
		const name = is_document_type ? this.chart_doc.document_type : this.chart_doc.report_name;

		if (!name) {
			console.warn("Cannot set route: No document_type or report_name found for chart:", this.chart_doc.name);
			return;
		}

		const route = frappe.utils.generate_route({
			name: name,
			type: is_document_type ? "doctype" : "report",
			is_query_report: !is_document_type,
		});

		let filters_to_apply = {};

		// Start with existing filters (e.g., from the dashboard's filter sidebar or time series)
		if (this.filters && Object.keys(this.filters).length) {
			filters_to_apply = { ...this.filters };
		}

		// *** Apply filter based on the clicked chart data point (e.g., "Unqualified") ***
		if (clickedLabel) {
			// Assuming the x-axis field in your chart (chart_doc.x_field)
			// corresponds to the fieldname in your DocType/Report for filtering.
			// Example: If chart shows "Lead Status", and x_field is "lead_status"
			const filter_fieldname = this.chart_doc.x_field;

			if (filter_fieldname) {
				if (is_document_type) {
					// For document types, filters are applied as document filters in the format:
					// { "doctype.fieldname": ["operator", "value"] }
					filters_to_apply[`${this.chart_doc.document_type}.${filter_fieldname}`] = ["=", clickedLabel];
				} else {
					// For reports, filters are applied directly in the format:
					// { "fieldname": "value" }
					filters_to_apply[filter_fieldname] = clickedLabel;
				}
			} else {
				console.warn("Cannot apply chart click filter: chart_doc.x_field is not defined.");
			}
		}

		// Set frappe.route_options based on the collected filters
		if (is_document_type) {
			// Convert filters_to_apply to the format expected by frappe.route_options for doctype lists
			if (Object.keys(filters_to_apply).length) {
				frappe.route_options = Object.keys(filters_to_apply).reduce((acc, filter_key) => {
					const filter_value = filters_to_apply[filter_key];
					if (Array.isArray(filter_value) && filter_value.length >= 2) {
						acc[filter_key] = filter_value;
					} else {
						// Assuming "=" operator by default if value is not an array
						acc[filter_key] = ["=", filter_value];
					}
					return acc;
				}, {});
			} else {
				frappe.route_options = {}; // Ensure it's empty if no filters are applied
			}
		} else {
			// For reports, frappe.route_options directly takes the filter object
			frappe.route_options = filters_to_apply;
		}
        console.log("Setting route with options:", frappe.route_options); // For debugging
		frappe.set_route(route);
	}


	get_chart_args() {
		let colors = this.get_chart_colors();
		let fieldtype, options;

		const chart_type_map = {
			Line: "line",
			Bar: "bar",
			Percentage: "percentage",
			Pie: "pie",
			Donut: "donut",
			Heatmap: "heatmap",
		};

		let max_slices = ["Pie", "Donut"].includes(this.chart_doc.type) ? 6 : 9;
		let chart_args = {
			data: this.data,
			type: chart_type_map[this.chart_doc.type],
			colors: colors,
			height: this.height,
			maxSlices: this.chart_doc.number_of_groups || max_slices,
			axisOptions: {
				xIsSeries: this.chart_doc.timeseries,
				shortenYAxisNumbers: 1,
			},
            // Removed onDataPointClick from here. We'll attach it directly to the dashboard_chart instance.
		};

		if (this.chart_doc.document_type) {
			let doctype_meta = frappe.get_meta(this.chart_doc.document_type);
			let field = doctype_meta.fields.find(
				(x) => x.fieldname == this.chart_doc.value_based_on
			);
			fieldtype = field?.fieldtype;
			options = field?.options;
		}

		if (this.chart_doc.chart_type == "Report" && this.report_result?.chart?.fieldtype) {
			fieldtype = this.report_result.chart.fieldtype;
			options = this.report_result.chart.options;
		}

		if (this.chart_doc.chart_type == "Custom" && this.chart_doc.custom_options) {
			let chart_options = JSON.parse(this.chart_doc.custom_options);
			fieldtype = chart_options.fieldtype;
			options = chart_options.options;
		}

		if (this.chart_doc.currency) {
			chart_args.tooltipOptions = {
				formatTooltipY: (value) => format_currency(value, this.chart_doc.currency),
			};
		} else {
			chart_args.tooltipOptions = {
				formatTooltipY: (value) =>
					frappe.format(
						value,
						{ fieldtype, options },
						{ always_show_decimals: true, inline: true }
					),
			};
		}

		if (this.chart_doc.type == "Heatmap") {
			const heatmap_year = parseInt(
				this.selected_heatmap_year ||
					this.chart_settings.heatmap_year ||
					this.chart_doc.heatmap_year
			);
			chart_args.data.start = new Date(`${heatmap_year}-01-01`);
			chart_args.data.end = new Date(`${heatmap_year + 1}-01-01`);
		}
		if (this.chart_doc.show_values_over_chart) chart_args.valuesOverPoints = true;
		let set_options = (options) => {
			let custom_options = JSON.parse(options);
			for (let key in custom_options) {
				if (
					typeof chart_args[key] === "object" &&
					typeof custom_options[key] === "object"
				) {
					chart_args[key] = Object.assign(chart_args[key], custom_options[key]);
				} else {
					chart_args[key] = custom_options[key];
				}
			}
		};

		if (this.custom_options) {
			set_options(this.custom_options);
		}

		if (this.chart_doc.custom_options) {
			set_options(this.chart_doc.custom_options);
		}

		return chart_args;
	}

	get_chart_colors() {
		let colors = [];
		if (this.chart_doc.y_axis.length) {
			this.chart_doc.y_axis.map((field) => {
				colors.push(field.color);
			});
		} else if (["Line", "Bar"].includes(this.chart_doc.type)) {
			colors = [this.chart_doc.color || []];
		} else if (this.chart_doc.type == "Heatmap") {
			colors = [];
		}

		return colors;
	}

	render_heatmap_legend() {
		let legend_colors;

		let set_legend_color = (options) => {
			legend_colors = JSON.parse(options).colors;
		};

		if (this.custom_options) {
			set_legend_color(this.custom_options);
		}

		if (this.chart_doc.custom_options) {
			set_legend_color(this.chart_doc.custom_options);
		}

		if (!this.$heatmap_legend && this.widget.width() > 991) {
			this.$heatmap_legend = $(`
				<div class="heatmap-legend">
					<ul class="legend-colors">
						<li style="background-color: ${legend_colors[0] || "#ebedf0"}"></li>
						<li style="background-color: ${legend_colors[1] || "#c6e48b"}"></li>
						<li style="background-color: ${legend_colors[2] || "#7bc96f"}"></li>
						<li style="background-color: ${legend_colors[3] || "#239a3b"}"></li>
						<li style="background-color: ${legend_colors[4] || "#196127"}"></li>
					</ul>
					<div class="legend-label">
						<div style="margin-bottom: 45px">${__("Less")}</div>
						<div>${__("More")}</div>
					</div>
				</div>
				`);
			this.body.append(this.$heatmap_legend);
		}
	}

	update_last_synced() {
		if (!this.chart_doc.last_synced_on) {
			return;
		}
		let last_synced_text = __("Last synced {0}", [
			comment_when(this.chart_doc.last_synced_on),
		]);
		this.subtitle_field.html(last_synced_text);
	}

	update_chart_object() {
		frappe.db.get_doc("Dashboard Chart", this.chart_doc.name).then((doc) => {
			this.chart_doc = doc;
			this.update_last_synced();
		});
	}

	prepare_chart_object() {
		if (this.chart_doc.type == "Heatmap" && !this.chart_doc.heatmap_year) {
			this.chart_doc.heatmap_year = frappe.dashboard_utils.get_year(
				frappe.datetime.now_date()
			);
		}

		return this.set_chart_filters();
	}

	set_chart_filters() {
		let user_saved_filters = this.chart_settings.filters || null;
		let chart_saved_filters = frappe.dashboard_utils.get_all_filters(this.chart_doc);

		if (this.chart_doc.chart_type == "Report") {
			return frappe.dashboard_utils
				.get_filters_for_chart_type(this.chart_doc)
				.then((filters) => {
					chart_saved_filters = this.update_default_date_filters(
						filters,
						chart_saved_filters
					);
					this.filters =
						frappe.utils.parse_array(user_saved_filters) ||
						frappe.utils.parse_array(this.filters) ||
						frappe.utils.parse_array(chart_saved_filters);
				});
		} else {
			this.filters =
				frappe.utils.parse_array(user_saved_filters) ||
				frappe.utils.parse_array(this.filters) ||
				frappe.utils.parse_array(chart_saved_filters);
			return Promise.resolve();
		}
	}

	update_default_date_filters(report_filters, chart_filters) {
		if (report_filters) {
			report_filters.map((f) => {
				if (["Date", "DateRange"].includes(f.fieldtype) && f.default) {
					if (f.reqd || chart_filters[f.fieldname]) {
						chart_filters[f.fieldname] = f.default;
					}
				}
			});
		}
		return chart_filters;
	}

	get_settings() {
		return frappe.model.with_doc("Dashboard Chart", this.chart_name).then((chart_doc) => {
			if (chart_doc) {
				this.chart_doc = chart_doc;
				if (this.chart_doc.chart_type == "Custom") {
					// custom source
					if (frappe.dashboards.chart_sources[this.chart_doc.source]) {
						this.settings = frappe.dashboards.chart_sources[this.chart_doc.source];
						return Promise.resolve();
					} else {
						const method =
							"frappe.desk.doctype.dashboard_chart_source.dashboard_chart_source.get_config";
						return frappe
							.xcall(method, { name: this.chart_doc.source })
							.then((config) => {
								frappe.dom.eval(config);
								this.settings =
									frappe.dashboards.chart_sources[this.chart_doc.source];
							});
					}
				} else if (this.chart_doc.chart_type == "Report") {
					this.settings = {
						method: "frappe.desk.query_report.run",
					};
					return Promise.resolve();
				} else {
					this.settings = {
						method: "frappe.desk.doctype.dashboard_chart.dashboard_chart.get",
					};
					return Promise.resolve();
				}
			}
		});
	}
}

ChartWidget.prototype.get_clickable_chart_config = function () {
	if (!window.crm_pp) return null;
	const configs = window.crm_pp.clickableChartConfigs || {};
	const candidates = [
		this.chart_doc?.name,
		this.chart_doc?.chart_name,
		this.chart_name,
		this.name,
		this.label,
	];

	for (const candidate of candidates) {
		if (candidate && configs[candidate]) {
			return configs[candidate];
		}
	}

	if (this.chart_doc?.document_type && configs[this.chart_doc.document_type]) {
		return configs[this.chart_doc.document_type];
	}

	return null;
};

ChartWidget.prototype.apply_clickable_chart = function (chartInstance) {
	if (!chartInstance || !window.crm_pp?.makeChartClickable) return;
	const config = this.get_clickable_chart_config();
	if (!config) {
		console.debug("ChartWidget: no clickable config found for chart", this.chart_doc?.name);
		return;
	}

	try {
		window.crm_pp.makeChartClickable(chartInstance, config);
	} catch (e) {
		console.error("ChartWidget: failed to apply clickable chart handler", e);
	}
};