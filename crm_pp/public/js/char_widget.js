// NOTE: Ensure hooks.py contains desk_include_js = ["crm_pp/public/js/chart_widget.js"] and run `bench build && bench restart`.
(function () {
	const READY_CHECK_DELAY = 200;
	const RETRY_MAX = 20;

	console.log("CRM PP: clickable chart helper script loaded");

	function sanitizeColors(colors) {
		const cleaned = (colors || []).filter(
			(color) => color && typeof color === "string" && color.trim() !== ""
		);
		if (cleaned.length !== (colors || []).length) {
			console.debug("CRM PP: sanitized chart colors", cleaned);
		}
		return cleaned;
	}

	function isNodeConnected(node) {
		return !!(node && (node.isConnected || (node.ownerDocument && node.ownerDocument.contains(node))));
	}

	function isDomNode(node) {
		return !!(node && typeof node === "object" && "nodeType" in node);
	}

	function normalizeLabel(label) {
		if (label === null || label === undefined) return "";
		const text = String(label).trim();
		if (/^null$/i.test(text)) return "";
		if (text === "—" || text === "-") return "";
		return text;
	}

	function openListView(doctype, filters) {
		frappe.route_options = filters;
		frappe.set_route("List", doctype);
	}

	function buildDefaultFilters(config, labelValue) {
		if (labelValue === "" && config.allow_null_as_blank) {
			return { [config.field]: "" };
		}
		if (labelValue === "" && config.null_to_is_null) {
			return { filters: [[config.doctype, config.field, "=", ""]] };
		}
		return { [config.field]: labelValue };
	}

	function handleChartClickPayload(label, value, config, context) {
		if (!config || !config.doctype || !config.field) {
			console.error("CRM PP: invalid clickable chart config", config);
			return;
		}

		let filterValue = label;
		if (config.valueTransform && typeof config.valueTransform === "function") {
			try {
				filterValue = config.valueTransform(label, value, context);
			} catch (e) {
				console.error("CRM PP: valueTransform error", e);
				filterValue = label;
			}
		} else {
			filterValue = normalizeLabel(label);
		}

		let routeFilters;
		if (typeof config.buildFilters === "function") {
			try {
				routeFilters = config.buildFilters({
					label,
					value,
					filterValue,
					widget: context,
				});
			} catch (e) {
				console.error("CRM PP: buildFilters error", e);
			}
		}

		if (!routeFilters) {
			routeFilters = buildDefaultFilters(config, filterValue);
		}

		console.info("CRM PP: chart click → list", config.doctype, routeFilters);
		if (frappe?.show_alert) {
			frappe.show_alert({
				message: __("Opening filtered {0} list...", [__(config.doctype)]),
				indicator: "blue",
			});
		}
		try {
			openListView(config.doctype, routeFilters);
		} catch (e) {
			console.error("CRM PP: failed to route to list", e);
		}
	}

	function attachChartjsClick(chartInstance, config, context) {
		const canvas = chartInstance.canvas || (chartInstance.chart && chartInstance.chart.canvas);
		if (!canvas) {
			console.warn("CRM PP: Chart.js canvas not found", chartInstance);
			return;
		}
		if (!isNodeConnected(canvas)) {
			console.debug("CRM PP: Chart.js canvas not connected, deferring listener attach");
				return;
			}

		const listenerKey = "__crm_pp_chartjs_click_listener__";
		if (canvas[listenerKey]) {
			console.debug("CRM PP: Chart.js listener already attached, skipping");
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
				console.error("CRM PP: Chart.js event read failed", e);
			}

			if (!elements || !elements.length) return;

			const el = elements[0];
			const datasetIndex =
				el.datasetIndex !== undefined ? el.datasetIndex : el._datasetIndex;
			const index = el.index !== undefined ? el.index : el._index;

			let dataLabel = "";
			if (
				chartInstance.data &&
				Array.isArray(chartInstance.data.labels) &&
				chartInstance.data.labels[index] !== undefined
			) {
				dataLabel = chartInstance.data.labels[index];
			} else if (
				chartInstance.data &&
				Array.isArray(chartInstance.data.datasets) &&
				chartInstance.data.datasets[datasetIndex] &&
				chartInstance.data.datasets[datasetIndex].label
			) {
				dataLabel = chartInstance.data.datasets[datasetIndex].label;
			}

			let dataValue = null;
			try {
				dataValue = chartInstance.data.datasets[datasetIndex].data[index];
			} catch (e) {
				dataValue = null;
			}

			handleChartClickPayload(dataLabel, dataValue, config, context);
		};

		canvas.addEventListener("click", handler);
		canvas[listenerKey] = handler;
		console.log("CRM PP: Chart.js click listener attached");
	}

	function attachBillboardClick(billboardChart, config, context) {
		const internal = billboardChart.chart || billboardChart;
		if (!internal) {
			console.warn("CRM PP: billboard chart instance missing internal chart", billboardChart);
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
					let dataLabel = d?.id ?? d?.name ?? d?.x ?? null;
					let dataValue = d?.value ?? d?.y ?? null;

					handleChartClickPayload(dataLabel, dataValue, config, context);

					try {
						oldOnClick(d, element);
					} catch (e) {
						console.warn("CRM PP: billboard original onclick error", e);
					}
				};
				internal[listenerKey] = true;
				attached = true;
				console.log("CRM PP: billboard onclick handler attached");
			} else if (internal && typeof internal.on === "function") {
				internal.on("click", (d) => {
					let dataLabel = d?.id ?? d?.name ?? d?.x ?? null;
					let dataValue = d?.value ?? d?.y ?? null;
					handleChartClickPayload(dataLabel, dataValue, config, context);
				});
				internal[listenerKey] = true;
				attached = true;
				console.log("CRM PP: billboard on('click') handler attached");
			}
		} catch (e) {
			console.warn("CRM PP: billboard click binding failed", e);
		}

		if (attached) return;

		try {
			const container =
				billboardChart.$el ||
				billboardChart.element ||
				(internal && (internal.$el || internal.element));
			if (container && !container[listenerKey]) {
				if (!isNodeConnected(container)) {
					console.debug("CRM PP: billboard container not connected, skipping listener attach");
					return;
				}
				const handler = (evt) => {
					const text =
						evt?.target?.textContent ||
						(evt?.target?.getAttribute && evt.target.getAttribute("data-id"));
					if (text) {
						handleChartClickPayload(text, null, config, context);
					}
				};
				container.addEventListener("click", handler);
				container[listenerKey] = handler;
				console.log("CRM PP: billboard click listener attached (container fallback)");
				return;
			}
			if (attachParentClick(billboardChart, config, context)) {
				return;
			}
			if (attachWidgetClick(context, config)) {
				return;
			}
		} catch (e) {
			if (attachParentClick(billboardChart, config, context, "parent")) {
				return;
			}
			if (attachWidgetClick(context, config)) {
				return;
			}
			console.warn("CRM PP: billboard fallback binding failed", e);
		}
	}

	function attachParentClick(chartObj, config, context, sourceLabel = "parent") {
		const parentEl =
			chartObj?.parent?.$el?.[0] ||
			chartObj?.parent?.$wrapper?.[0] ||
			chartObj?.parent?.$chart?.[0] ||
			chartObj?.parent?.element ||
			(chartObj?.parent instanceof HTMLElement ? chartObj.parent : null);

		if (parentEl && !parentEl.__crm_pp_parent_listener__) {
			parentEl.addEventListener("click", (evt) => {
				const text = evt.target?.textContent?.trim();
				if (text) {
					handleChartClickPayload(text, null, config, context);
				}
			});
			parentEl.__crm_pp_parent_listener__ = true;
			console.log(`CRM PP: billboard click listener attached (${sourceLabel} fallback)`);
			return true;
		}

		if (!parentEl) {
			console.info("CRM PP: attachParentClick unable to resolve parent", {
				chartObjKeys: chartObj ? Object.keys(chartObj) : null,
				parentType: chartObj?.parent?.constructor?.name,
			});
			return false;
		}
		if (!isNodeConnected(parentEl)) {
			console.debug("CRM PP: parent element not connected, skipping attach", {
				parentType: parentEl.constructor?.name,
			});
			return false;
		}
		return !!parentEl;
	}

	function attachWidgetClick(context, config) {
		const wrapper =
			context?.chart_wrapper?.[0] ||
			(typeof context?.chart_wrapper?.get === "function" && context.chart_wrapper.get(0)) ||
			context?.body?.[0] ||
			(typeof context?.body?.get === "function" && context.body.get(0)) ||
			context?.widget?.[0] ||
			(typeof context?.widget?.get === "function" && context.widget.get(0)) ||
			null;

		if (wrapper && !wrapper.__crm_pp_wrapper_listener__) {
			wrapper.addEventListener("click", (evt) => {
				const text = evt.target?.textContent?.trim();
				if (text) {
					handleChartClickPayload(text, null, config, context);
				}
			});
			wrapper.__crm_pp_wrapper_listener__ = true;
			console.log("CRM PP: chart wrapper click listener attached");
			return true;
		}

		if (!wrapper) {
			console.info("CRM PP: attachWidgetClick unable to resolve wrapper", {
				contextKeys: context ? Object.keys(context) : null,
			});
			return false;
		}
		if (!isNodeConnected(wrapper)) {
			console.debug("CRM PP: wrapper not connected, skipping attach");
			return false;
		}

		return !!wrapper;
	}

	function makeChartClickable(chartObj, config, context) {
		console.log("CRM PP: makeChartClickable invoked for", config?.doctype, config?.field);
		if (!chartObj || !config || !config.doctype || !config.field) {
			console.error("CRM PP: makeChartClickable missing chart or config", chartObj, config);
			return;
		}

		try {
			if (
				chartObj instanceof Object &&
				(chartObj.config || chartObj.data) &&
				(chartObj.canvas || (chartObj.chart && chartObj.chart.canvas))
			) {
				attachChartjsClick(chartObj, config, context);
				return;
			}
		} catch (e) {
			console.warn("CRM PP: Chart.js detection failed", e);
		}

		try {
			if (chartObj.chart || chartObj.$el || chartObj.element) {
				attachBillboardClick(chartObj, config, context);
				return;
				}
			} catch (e) {
			console.warn("CRM PP: billboard detection failed", e);
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
							handleChartClickPayload(txt.trim(), null, config, context);
						}
					};
					el.addEventListener("click", handler);
					el[listenerKey] = handler;
					console.log("CRM PP: fallback click listener attached to selector", config.selector);
				}
				return;
			}
		}

		if (attachParentClick(chartObj, config, context)) {
			return;
		}

		if (attachWidgetClick(context, config)) {
			return;
		}

		console.info("CRM PP: unsupported chart instance details", {
			chartKeys: chartObj ? Object.keys(chartObj) : null,
			contextKeys: context ? Object.keys(context) : null,
		});
		console.error("CRM PP: unsupported chart instance", chartObj, config);
	}

	function registerGlobals() {
		window.crm_pp = window.crm_pp || {};

		if (typeof window.crm_pp.makeChartClickable !== "function") {
			window.crm_pp.makeChartClickable = (chart, config, context) =>
				makeChartClickable(chart, config, context);
		}

		const defaults = {
			leads_by_vertical: {
				doctype: "Lead",
				field: "vertical",
				valueTransform: normalizeLabel,
				selector: "#leads-by-vertical-chart",
				null_to_is_null: true,
			},
			"Leads by Vertical": {
				doctype: "Lead",
				field: "vertical",
				valueTransform: normalizeLabel,
				selector: "#leads-by-vertical-chart",
				null_to_is_null: true,
			},
			opportunities_by_vertical: {
				doctype: "Opportunity",
				field: "vertical",
				valueTransform: normalizeLabel,
				selector: "#opportunities-by-vertical-chart",
				null_to_is_null: true,
			},
			"Opportunities by Vertical": {
				doctype: "Opportunity",
				field: "vertical",
				valueTransform: normalizeLabel,
				selector: "#opportunities-by-vertical-chart",
				null_to_is_null: true,
			},
		};

		window.crm_pp.clickableChartConfigs = Object.assign(
			defaults,
			window.crm_pp.clickableChartConfigs || {}
		);
	}

	function getClickableConfig(widget) {
		const configs = window.crm_pp?.clickableChartConfigs || {};
		const candidates = [
			widget.chart_doc?.name,
			widget.chart_doc?.chart_name,
			widget.chart_name,
			widget.name,
			widget.label,
			widget.chart_doc?.document_type,
		];
		for (const key of candidates) {
			if (key && configs[key]) return configs[key];
		}
		return null;
	}

	function patchChartWidget(ChartWidget) {
		if (!ChartWidget || ChartWidget.prototype.__crm_pp_clickable_patched) return;

		ChartWidget.prototype.__crm_pp_clickable_patched = true;

		const originalGetChartColors = ChartWidget.prototype.get_chart_colors;
		if (typeof originalGetChartColors === "function") {
			ChartWidget.prototype.get_chart_colors = function (...args) {
				const colors = originalGetChartColors.apply(this, args);
				if (!Array.isArray(colors)) {
					return [];
				}
				const sanitized = sanitizeColors(colors);
				if (sanitized.length !== colors.length) {
					console.debug("CRM PP: safe colors applied", sanitized, this.chart_doc?.name);
				}
				return sanitized;
			};
		}

		const originalGetChartArgs = ChartWidget.prototype.get_chart_args;
		if (typeof originalGetChartArgs === "function") {
			ChartWidget.prototype.get_chart_args = function (...args) {
				const chartArgs = originalGetChartArgs.apply(this, args) || {};
				const rawColors = Array.isArray(chartArgs.colors)
					? chartArgs.colors
					: chartArgs.colors
					? [chartArgs.colors]
					: [];
				const sanitized = sanitizeColors(rawColors);
				if (sanitized.length !== rawColors.length) {
					console.debug("CRM PP: safe chart args colors applied", sanitized, this.chart_doc?.name);
				}
				chartArgs.colors = sanitized;
				return chartArgs;
			};
		}

		const originalRefresh = ChartWidget.prototype.refresh;
		if (typeof originalRefresh === "function") {
			ChartWidget.prototype.refresh = function (...args) {
				this.__crm_pp_clickable_attached__ = false;
				this.__crm_pp_clickable_chart__ = null;
				return originalRefresh.apply(this, args);
			};
		}

		ChartWidget.prototype.get_clickable_chart_config = function () {
			return getClickableConfig(this);
		};

		ChartWidget.prototype.apply_clickable_chart = function (chartInstance) {
			if (!chartInstance || !window.crm_pp?.makeChartClickable) return;
			const config = this.get_clickable_chart_config();
			if (!config) {
				console.debug("ChartWidget: no clickable config found for chart", this.chart_doc?.name);
				return;
			}

			if (this.__crm_pp_clickable_chart__ !== chartInstance) {
				this.__crm_pp_clickable_attached__ = false;
				this.__crm_pp_clickable_chart__ = chartInstance;
			} else if (this.__crm_pp_clickable_attached__) {
				console.debug("CRM PP: clickable listener already active", this.chart_doc?.name);
				return;
			}

			const wrapperEl = this.chart_wrapper?.[0];
			if (wrapperEl && !isNodeConnected(wrapperEl)) {
				console.debug("CRM PP: chart wrapper not connected yet, scheduling reapply", this.chart_doc?.name);
				this.schedule_clickable_reapply();
				return;
			}

			const rootCandidates = [
				chartInstance?.canvas,
				chartInstance?.chart?.canvas,
				chartInstance?.chart?.element,
				chartInstance?.parent?.element,
			].filter(isDomNode);

			if (rootCandidates.length && !rootCandidates.some(isNodeConnected)) {
				console.debug("CRM PP: chart roots not yet connected, scheduling reapply", this.chart_doc?.name);
				this.schedule_clickable_reapply();
				return;
			}

			const primaryElement = rootCandidates.find(isNodeConnected) || wrapperEl || null;
			if (primaryElement && !document.contains(primaryElement)) {
				console.debug("CRM PP: chart element not yet in document, scheduling reapply", this.chart_doc?.name);
				this.schedule_clickable_reapply();
				return;
			}

			console.log("CRM PP: applying clickable chart for", this.chart_doc?.name);
			try {
				window.crm_pp.makeChartClickable(chartInstance, config, this);
				this.__crm_pp_clickable_attached__ = true;
				this.__crm_pp_reapply_attempts = 0;
			} catch (e) {
				console.error("ChartWidget: failed to apply clickable chart handler", e);
			}
		};

		ChartWidget.prototype.schedule_clickable_reapply = function () {
			if (this.__crm_pp_clickable_attached__) return;
			if (this.__crm_pp_reapply_scheduled__) return;
			if ((this.__crm_pp_reapply_attempts || 0) >= 3) {
				console.warn("CRM PP: clickable handler reapply limit reached", this.chart_doc?.name);
				return;
			}
			const wrapperEl = this.chart_wrapper?.[0];
			if (wrapperEl && !isNodeConnected(wrapperEl)) {
				console.debug("CRM PP: wrapper still detached, delaying clickable attach", this.chart_doc?.name);
			}
			this.__crm_pp_reapply_scheduled__ = true;
			this.__crm_pp_reapply_attempts = (this.__crm_pp_reapply_attempts || 0) + 1;
			setTimeout(() => {
				this.__crm_pp_reapply_scheduled__ = false;
				if (!this.dashboard_chart || this.__crm_pp_clickable_attached__) return;
				const rootCandidates = [
					this.dashboard_chart?.canvas,
					this.dashboard_chart?.chart?.canvas,
					this.dashboard_chart?.chart?.element,
				].filter(isDomNode);
				if (rootCandidates.length && !rootCandidates.some(isNodeConnected)) {
					console.debug("CRM PP: chart roots still not connected after delay", this.chart_doc?.name);
					return;
				}
				const primaryElement = rootCandidates.find(isNodeConnected) || wrapperEl || null;
				if (primaryElement && !document.contains(primaryElement)) {
					console.debug("CRM PP: chart element still missing from document", this.chart_doc?.name);
					return;
				}
				console.debug("CRM PP: reapplying clickable handler after delay", this.chart_doc?.name);
				this.apply_clickable_chart(this.dashboard_chart);
			}, 1000);
		};

		const originalRender = ChartWidget.prototype.render;
		ChartWidget.prototype.render = async function (...args) {
			const result = await originalRender.apply(this, args);
			if (this.dashboard_chart) {
				const rootCandidates = [
					this.dashboard_chart?.chart?.element,
					this.dashboard_chart?.chart?.canvas,
					this.dashboard_chart?.canvas,
				].filter(isDomNode);
				const primaryElement = rootCandidates.find(isNodeConnected);
				if (primaryElement && !document.contains(primaryElement)) {
					console.debug("CRM PP: chart element not yet mounted after render, scheduling clickable attach", this.chart_doc?.name);
					this.schedule_clickable_reapply();
				} else {
					this.apply_clickable_chart(this.dashboard_chart);
				}
			} else {
				console.debug("CRM PP: render completed without dashboard_chart instance", this.chart_doc?.name);
			}
			return result;
		};
	}

	function tryInit() {
		if (!window.frappe) return false;
		registerGlobals();

		const ChartWidget =
			frappe.widget?.widget_factory?.chart ||
			frappe.widget?.Chart ||
			frappe.dashboard_widgets?.ChartWidget;
		if (!ChartWidget) {
			return false;
		}

		patchChartWidget(ChartWidget);
		console.log("✅ CRM PP: ChartWidget patch applied successfully");
		return true;
	}

	let retries = 0;
	if (!tryInit()) {
		const timer = setInterval(() => {
			if (tryInit()) {
				clearInterval(timer);
				return;
			}
			if (++retries > RETRY_MAX) {
				clearInterval(timer);
				console.warn("CRM PP: ChartWidget patch retry limit exceeded");
			}
		}, READY_CHECK_DELAY);
	}
})();

/*
Testing steps after fix:
1. Reload CRM Dashboard.
2. Ensure no "removeChild" or "invalid color" errors appear in console.
3. Click any bar or pie chart segment → filtered list opens.
4. Resize the window → no errors in console.
5. Refresh dashboard again → only one set of click listeners attached.
6. Works in both frappe.Chart and Chart.js instances.
*/