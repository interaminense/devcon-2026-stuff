(() => {
	const GRAPHQL_URL = '/o/analytics-rest/v1.0/graphql';

	const METRIC_FIELDS = `
		value
		previousValue
		trend {
			percentage
			trendClassification
		}
		histogram {
			metrics {
				key
				value
			}
		}
	`;

	const RANGE_VARIABLES = `
		$channelId: String!
		$rangeEnd: String
		$rangeKey: Int
		$rangeStart: String
	`;

	const RANGE_ARGUMENTS = `
		channelId: $channelId
		rangeEnd: $rangeEnd
		rangeKey: $rangeKey
		rangeStart: $rangeStart
	`;

	function siteQuery(field) {
		return `
			query SiteMetric(${RANGE_VARIABLES} $interval: String!) {
				site(${RANGE_ARGUMENTS} interval: $interval) {
					${field} {
						${METRIC_FIELDS}
					}
				}
			}
		`;
	}

	function individualQuery(field) {
		return `
			query IndividualMetric(
				$channelId: String!
				$interval: String!
				$rangeKey: Int
			) {
				individualMetric(
					channelId: $channelId
					interval: $interval
					rangeKey: $rangeKey
				) {
					${field} {
						${METRIC_FIELDS}
					}
				}
			}
		`;
	}

	function compositionQuery(field, extraArguments = '') {
		return `
			query Composition(${RANGE_VARIABLES}) {
				${field}(${RANGE_ARGUMENTS} ${extraArguments} size: 10 start: 0) {
					compositions {
						count
						name
					}
					total
				}
			}
		`;
	}

	function breakdownQuery(field) {
		return `
			query VisitorsBreakdown(${RANGE_VARIABLES}) {
				site(${RANGE_ARGUMENTS}) {
					visitorsMetric {
						${field} {
							value
							valueKey
						}
					}
				}
			}
		`;
	}

	const VISIT_FREQUENCY_QUERY = `
		query VisitFrequency(${RANGE_VARIABLES}) {
			visitFrequency(${RANGE_ARGUMENTS}) {
				visitFrequency {
					count
					name
				}
			}
		}
	`;

	const TRAFFIC_HEATMAP_QUERY = `
		query TrafficHeatmap(${RANGE_VARIABLES}) {
			siteVisitorHeatMap(${RANGE_ARGUMENTS} timeZoneId: "UTC") {
				colDimension
				rowDimension
				value
			}
		}
	`;

	const TOP_PAGES_QUERY = `
		query TopPages(${RANGE_VARIABLES}) {
			pages(
				${RANGE_ARGUMENTS}
				size: 8
				sort: {column: "visitorsMetric", type: DESC}
				start: 0
			) {
				assetMetrics {
					... on PageMetric {
						assetTitle
						bounceRateMetric {
							value
						}
						entrancesMetric {
							value
						}
						exitRateMetric {
							value
						}
						viewsMetric {
							value
						}
						visitorsMetric {
							value
						}
					}
				}
			}
		}
	`;

	function toItems(pairs) {
		return pairs
			.map(([label, value]) => ({label, value: value || 0}))
			.sort((a, b) => b.value - a.value)
			.slice(0, 10);
	}

	function fromComposition(bag) {
		return toItems(
			(bag?.compositions || []).map(({count, name}) => [name, count])
		);
	}

	function capitalize(text) {
		return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
	}

	function pageTitle(title) {
		return (title || 'Untitled').split(' - ')[0];
	}

	// Each shape of data offers its own chart types. The first one is the
	// default.

	const CHARTS = {
		grid: [{id: 'heatmap', label: 'Heatmap'}],
		items: [
			{id: 'bars', label: 'Horizontal bars'},
			{id: 'columns', label: 'Columns'},
			{id: 'donut', label: 'Donut'},
			{id: 'table', label: 'Table'},
		],
		pages: [
			{id: 'table', label: 'Table'},
			{id: 'bars', label: 'Horizontal bars'},
			{id: 'columns', label: 'Columns'},
			{id: 'donut', label: 'Donut'},
		],
		series: [
			{id: 'area', label: 'Area'},
			{id: 'line', label: 'Line'},
			{id: 'columns', label: 'Daily columns'},
			{id: 'number', label: 'Number only'},
		],
	};

	function seriesMetric(group, query, root, id, label, format) {
		return {
			extract: (data) => data[root]?.[id],
			format,
			group,
			id,
			label,
			query,
			shape: 'series',
			supportsCustomRange: root === 'site',
		};
	}

	function siteMetric(id, label, format = 'number') {
		return seriesMetric('Site', siteQuery(id), 'site', id, label, format);
	}

	function individualMetric(id, label) {
		return seriesMetric(
			'Individuals',
			individualQuery(id),
			'individualMetric',
			id,
			label,
			'number'
		);
	}

	function itemsMetric(group, id, label, query, extract, defaultChart) {
		return {
			defaultChart,
			extract,
			format: 'number',
			group,
			id,
			label,
			query,
			shape: 'items',
			supportsCustomRange: true,
		};
	}

	function breakdownMetric(id, label, field) {
		return itemsMetric(
			'Visitors breakdown',
			id,
			label,
			breakdownQuery(field),
			(data) =>
				toItems(
					(data.site?.visitorsMetric?.[field] || []).map(
						({value, valueKey}) => [valueKey, value]
					)
				),
			field === 'device' ? 'donut' : undefined
		);
	}

	const CATALOG = [
		siteMetric('visitorsMetric', 'Visitors'),
		siteMetric('sessionsMetric', 'Sessions'),
		siteMetric('anonymousVisitorsMetric', 'Anonymous visitors'),
		siteMetric('knownVisitorsMetric', 'Known visitors'),
		siteMetric('bounceRateMetric', 'Bounce rate', 'percent'),
		siteMetric('sessionDurationMetric', 'Session duration', 'duration'),
		siteMetric('sessionsPerVisitorMetric', 'Sessions per visitor', 'ratio'),
		individualMetric('totalIndividualsMetric', 'Total individuals'),
		individualMetric('knownIndividualsMetric', 'Known individuals'),
		individualMetric('anonymousIndividualsMetric', 'Anonymous individuals'),
		itemsMetric(
			'Acquisition',
			'acquisitionChannel',
			'Acquisition by channel',
			compositionQuery('acquisitions', 'acquisitionType: CHANNEL'),
			(data) => fromComposition(data.acquisitions),
			'donut'
		),
		itemsMetric(
			'Acquisition',
			'acquisitionReferrer',
			'Acquisition by referrer',
			compositionQuery('acquisitions', 'acquisitionType: REFERRER'),
			(data) => fromComposition(data.acquisitions)
		),
		itemsMetric(
			'Acquisition',
			'acquisitionSourceMedium',
			'Acquisition by source / medium',
			compositionQuery('acquisitions', 'acquisitionType: SOURCE_MEDIUM'),
			(data) => fromComposition(data.acquisitions)
		),
		itemsMetric(
			'Behavior',
			'searchTerms',
			'Search terms',
			compositionQuery('searchTerms'),
			(data) => fromComposition(data.searchTerms)
		),
		itemsMetric(
			'Behavior',
			'siteInterests',
			'Site interests',
			compositionQuery('siteInterests'),
			(data) => fromComposition(data.siteInterests)
		),
		itemsMetric(
			'Behavior',
			'visitFrequency',
			'Visit frequency',
			VISIT_FREQUENCY_QUERY,
			(data) =>
				toItems(
					(data.visitFrequency?.visitFrequency || []).map(
						({count, name}) => [capitalize(name), count]
					)
				),
			'columns'
		),
		{
			extract: (data) => data.siteVisitorHeatMap || [],
			format: 'number',
			group: 'Behavior',
			id: 'trafficHeatmap',
			label: 'Traffic by day and hour',
			query: TRAFFIC_HEATMAP_QUERY,
			shape: 'grid',
			supportsCustomRange: true,
		},
		{
			extract: (data) =>
				(data.pages?.assetMetrics || []).map((page) => ({
					bounceRate: page.bounceRateMetric?.value,
					entrances: page.entrancesMetric?.value,
					exitRate: page.exitRateMetric?.value,
					label: pageTitle(page.assetTitle),
					value: page.visitorsMetric?.value || 0,
					views: page.viewsMetric?.value,
				})),
			format: 'number',
			group: 'Behavior',
			id: 'topPages',
			label: 'Top pages',
			query: TOP_PAGES_QUERY,
			shape: 'pages',
			supportsCustomRange: true,
		},
		breakdownMetric('visitorsByDevice', 'Visitors by device', 'device'),
		breakdownMetric('visitorsByBrowser', 'Visitors by browser', 'browser'),
		breakdownMetric(
			'visitorsByCountry',
			'Visitors by country',
			'geolocation'
		),
	];

	const RANGES = [
		{key: 0, label: 'Last 24 hours'},
		{key: 7, label: 'Last 7 days'},
		{key: 30, label: 'Last 30 days'},
		{key: 90, label: 'Last 90 days'},
		{key: 365, label: 'Last 365 days'},
	];

	const DEFAULT_CONFIG = {
		aiInsight: false,
		chart: '',
		metric: 'visitorsMetric',
		range: {key: 30},
		title: '',
	};

	globalThis.LdpMetricCatalog = CATALOG;
	globalThis.LdpMetricCharts = CHARTS;

	if (typeof HTMLElement === 'undefined') {
		return;
	}

	function getMetric(id) {
		return CATALOG.find((metric) => metric.id === id) || CATALOG[0];
	}

	function getCharts(metric) {
		return CHARTS[metric.shape];
	}

	function getChartLabel(chartId) {
		return (
			Object.values(CHARTS)
				.flat()
				.find(({id}) => id === chartId)?.label || chartId
		);
	}

	function getChart(metric, chartId) {
		const charts = getCharts(metric);

		return (
			charts.find(({id}) => id === chartId) ||
			charts.find(({id}) => id === metric.defaultChart) ||
			charts[0]
		).id;
	}

	function getVariables(channelId, metric, range) {
		const variables = {channelId, interval: 'D'};

		if (range.start && range.end && metric.supportsCustomRange) {
			return {...variables, rangeEnd: range.end, rangeStart: range.start};
		}

		// rangeKey 0 is the last 24 hours, which LDP answers per hour

		const rangeKey = range.key ?? 30;

		return {
			...variables,
			interval: rangeKey === 0 ? 'H' : 'D',
			rangeKey,
		};
	}

	function formatValue(value, format) {
		if (value === null || value === undefined || Number.isNaN(value)) {
			return '-';
		}

		if (format === 'percent') {
			return `${(value * 100).toFixed(1)}%`;
		}

		if (format === 'duration') {
			const seconds = Math.round(value / 1000);

			return seconds < 60
				? `${seconds}s`
				: `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
		}

		if (format === 'ratio') {
			return value.toFixed(2);
		}

		return Math.round(value).toLocaleString();
	}

	function escape(text) {
		return String(text ?? '').replace(
			/[&<>"']/g,
			(character) =>
				({
					'"': '&quot;',
					'&': '&amp;',
					"'": '&#39;',
					'<': '&lt;',
					'>': '&gt;',
				})[character]
		);
	}

	async function request(url, options = {}) {
		const response = await fetch(url, {
			...options,
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				'x-csrf-token': Liferay.authToken,
				...options.headers,
			},
		});

		if (!response.ok) {
			const error = new Error(`${url} returned ${response.status}`);

			error.status = response.status;

			throw error;
		}

		return response.json();
	}

	let channelIdPromise;

	function getChannelId() {
		if (!channelIdPromise) {
			channelIdPromise = request(
				'/o/analytics-settings-rest/v1.0/channels?pageSize=200'
			)
				.then((page) => {
					const groupId = Number(
						Liferay.ThemeDisplay.getScopeGroupId()
					);

					const channel = (page.items || []).find((item) =>
						(item.dataSources || []).some((dataSource) =>
							(dataSource.siteIds || [])
								.map(Number)
								.includes(groupId)
						)
					);

					if (!channel) {
						throw new Error(
							'This site is not assigned to an LDP property.'
						);
					}

					return channel.channelId;
				})
				.catch((error) => {
					channelIdPromise = null;

					if (error.status === 400) {
						throw new Error('This DXP is not connected to LDP.');
					}

					throw error;
				});
		}

		return channelIdPromise;
	}

	function postQuery(query, variables) {
		const send = () =>
			request(GRAPHQL_URL, {
				body: JSON.stringify({query, variables}),
				method: 'POST',
			});

		// The proxy gives up after about 10 s and answers 502. That happens on
		// LDP's cold cache (individual metrics, mostly), and the second attempt
		// is usually fast.

		return send().catch((error) => {
			if (error.status === 502) {
				return send();
			}

			throw error;
		});
	}

	const queryCache = new Map();

	function runQuery(query, variables) {
		const key = JSON.stringify([query, variables]);

		if (!queryCache.has(key)) {
			queryCache.set(
				key,
				postQuery(query, variables)
					.then((json) => {
						if (json.errors) {
							throw new Error(json.errors[0].message);
						}

						if (json.error) {
							throw new Error(json.message || json.error);
						}

						return json.data;
					})
					.catch((error) => {
						queryCache.delete(key);

						throw error;
					})
			);
		}

		return queryCache.get(key);
	}

	// Each card's configuration is an entry of the LDP Metric Card object, keyed
	// by the entry's external reference code. The key is the id of the portlet
	// that wraps the card, which DXP generates per widget instance and keeps
	// between the page draft and the published page.

	const OBJECT_URL = '/o/c/ldpmetriccards';

	function getInstanceKey(element) {
		const wrapper = element.closest('[id^="p_p_id_"]');

		return wrapper?.id.match(/^p_p_id_(.+)_$/)?.[1] || null;
	}

	function getEntryURL(key) {
		return `${OBJECT_URL}/by-external-reference-code/${encodeURIComponent(key)}`;
	}

	async function loadConfig(key) {
		try {
			const entry = await request(getEntryURL(key));

			const custom = Boolean(entry.rangeStart && entry.rangeEnd);

			return {
				aiInsight: Boolean(entry.aiInsight),
				chart: entry.chart || '',
				metric: entry.metric,
				range: custom
					? {
							end: entry.rangeEnd.slice(0, 10),
							start: entry.rangeStart.slice(0, 10),
						}
					: {key: entry.rangeKey ?? DEFAULT_CONFIG.range.key},
				title: entry.title || '',
			};
		}
		catch (error) {

			// 404 means the card was never configured. Guests without
			// permission to view the entries also fall back to the default.

			if (error.status !== 404) {
				console.warn('[ldp-metric-card] Unable to load the configuration', error);
			}

			return null;
		}
	}

	function saveConfig(key, {aiInsight, chart, metric, range, title}) {
		return request(getEntryURL(key), {
			body: JSON.stringify({
				aiInsight: Boolean(aiInsight),
				chart,
				metric,
				rangeEnd: range.end || null,
				rangeKey: range.key ?? null,
				rangeStart: range.start || null,
				title,
			}),
			method: 'PUT',
		});
	}

	// AI Hub insight. The DXP hands out the AI Hub token; the browser then
	// talks to AI Hub directly: it subscribes to a server-sent event stream,
	// starts the agent with the stream key, and reads the answer from the
	// event named after the agent.

	const INSIGHT_AGENT_ERC = 'DEVCON_2026_LDP_METRIC_INSIGHT';

	const INSIGHT_TIMEOUT = 60000;

	function compact(value, depth = 0) {
		if (Array.isArray(value)) {
			return value.slice(-31).map((item) => compact(item, depth + 1));
		}

		if (value && typeof value === 'object') {
			return depth > 4
				? null
				: Object.fromEntries(
						Object.entries(value).map(([key, item]) => [
							key,
							compact(item, depth + 1),
						])
					);
		}

		return typeof value === 'number' ? Math.round(value * 1000) / 1000 : value;
	}

	// The firewall in front of AI Hub rejects request bodies that carry
	// nested JSON (objects or arrays inside the context string), so the
	// summary goes as plain text lines, without URLs

	function toText(value, prefix = '') {
		if (Array.isArray(value)) {
			const items = value
				.map((item) =>
					item && typeof item === 'object'
						? Object.entries(item)
								.filter(([, field]) => !isLink(field))
								.map(([key, field]) => `${key} ${field ?? 'n/a'}`)
								.join(', ')
						: String(item)
				)
				.join('; ');

			return `${prefix}: ${items || 'none'}`;
		}

		if (value && typeof value === 'object') {
			return Object.entries(value)
				.filter(([, field]) => !isLink(field))
				.map(([key, field]) =>
					toText(field, prefix ? `${prefix} ${key}` : key)
				)
				.join('\n');
		}

		return `${prefix}: ${value ?? 'n/a'}`;
	}

	function isLink(value) {
		return typeof value === 'string' && /^https?:/.test(value);
	}

	// One agent call at a time, so a page full of cards does not burst

	let insightQueue = Promise.resolve();

	function requestInsight(metrics) {
		const next = insightQueue.then(() => callInsightAgentWithRetry(metrics));

		insightQueue = next.catch(() => {});

		return next;
	}

	// AI Hub sometimes fails a call for a moment: an HTML 403 from its
	// firewall, or a 400 from its server. One retry after a short pause
	// usually goes through.

	async function callInsightAgentWithRetry(metrics) {
		try {
			return await callInsightAgent(metrics);
		}
		catch (error) {
			if (/not configured|404/.test(error.message)) {
				throw error;
			}

			await new Promise((resolve) => setTimeout(resolve, 4000));

			return callInsightAgent(metrics);
		}
	}

	async function callInsightAgent(metrics) {
		if (!INSIGHT_AGENT_ERC) {
			throw new Error('The AI Hub insight agent is not configured yet.');
		}

		const token = await request('/o/ai-hub-cell/v1.0/authorization-tokens', {
			method: 'POST',
		});

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), INSIGHT_TIMEOUT);

		try {
			const response = await fetch(
				`${token.serviceURL}/o/ai-hub/v1.0/agent-instances/subscribe`,
				{
					headers: {
						Accept: 'text/event-stream',
						Authorization: `Bearer ${token.accessToken}`,
					},
					signal: controller.signal,
				}
			);

			if (!response.ok) {
				throw new Error(`AI Hub returned ${response.status}`);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			let buffer = '';

			while (true) {
				const {done, value} = await reader.read();

				if (done) {
					throw new Error('AI Hub closed the stream without an answer.');
				}

				buffer += decoder.decode(value, {stream: true});

				let end;

				while ((end = buffer.indexOf('\n\n')) >= 0) {
					const block = buffer.slice(0, end);

					buffer = buffer.slice(end + 2);

					const name = block.match(/^event: ?(.*)$/m)?.[1];
					const data = block
						.split('\n')
						.filter((line) => line.startsWith('data:'))
						.map((line) => line.slice(5).trim())
						.join('\n');

					if (name === 'Subscribe') {
						const started = await fetch(
							`${token.serviceURL}/o/ai-hub/v1.0/agent-instances`,
							{
								body: JSON.stringify({
									agentDefinitionExternalReferenceCode:
										INSIGHT_AGENT_ERC,
									context: {metrics: toText(metrics)},
									sseEventSinkKey: data,
								}),
								headers: {
									'Accept': 'application/json',
									'Authorization': `Bearer ${token.accessToken}`,
									'Content-Type': 'application/json',
									'Liferay-AI-Hub-Cell-On-Behalf-Of': token.userToken,
								},
								method: 'POST',
							}
						);

						if (!started.ok) {
							throw new Error(`AI Hub returned ${started.status}`);
						}
					}
					else if (name === INSIGHT_AGENT_ERC) {
						return JSON.parse(data).data;
					}
					else if (name === 'Agent Invocation Failed') {
						throw new Error('The AI Hub agent could not answer.');
					}
				}
			}
		}
		catch (error) {
			if (error.name === 'AbortError') {
				throw new Error('AI Hub took too long to answer.');
			}

			throw error;
		}
		finally {
			clearTimeout(timer);

			controller.abort();
		}
	}

	function renderInsight(state) {
		const text =
			state.status === 'loading'
				? 'Asking AI Hub...'
				: state.status === 'error'
					? state.message
					: state.text;

		return `
			<div class="insight-label">✦ AI insight</div>
			<p class="insight-text${state.status === 'error' ? ' insight-error' : ''}">${state.status === 'loading' ? '<span class="spinner" aria-hidden="true"></span>' : ''}${escape(text)}</p>
		`;
	}

	const DEFAULT_PALETTE = [
		'#0b5fff',
		'#4fbfa5',
		'#ffb46e',
		'#ff5f5f',
		'#a46ef1',
		'#50d2a0',
		'#f7c948',
		'#6b6c7e',
		'#9fc5ff',
		'#ff9ac1',
	];

	// A page can restyle the card through CSS custom properties, which reach
	// into the shadow root. --ldp-palette replaces the series colors.

	let PALETTE = DEFAULT_PALETTE;

	function readPalette(element) {
		const custom = getComputedStyle(element)
			.getPropertyValue('--ldp-palette')
			.split(',')
			.map((color) => color.trim())
			.filter(Boolean);

		if (custom.length) {
			PALETTE = custom;
		}
	}

	const EMPTY = '<div class="empty">No data for this period.</div>';

	function renderAxis(first, last) {
		return `
			<div class="axis">
				<span>${escape(first)}</span>
				<span>${escape(last)}</span>
			</div>
		`;
	}

	function renderSeriesPath(points, chart) {
		const height = 80;
		const width = 300;

		const max = Math.max(1, ...points.map(({value}) => value || 0));

		if (chart === 'columns') {
			const slot = width / points.length;

			return `
				<svg class="chart" preserveAspectRatio="none" viewBox="0 0 ${width} ${height}">
					${points
						.map(({key, value}, index) => {
							const barHeight = ((value || 0) / max) * (height - 4);

							return `<rect class="column" height="${barHeight.toFixed(1)}" width="${Math.max(slot - 1, 0.5).toFixed(1)}" x="${(index * slot).toFixed(1)}" y="${(height - barHeight).toFixed(1)}"><title>${escape(key.slice(0, 10))}: ${value}</title></rect>`;
						})
						.join('')}
				</svg>
			`;
		}

		const step = width / (points.length - 1);

		const line = points
			.map(
				({value}, index) =>
					`${(index * step).toFixed(1)},${(height - 4 - ((value || 0) / max) * (height - 8)).toFixed(1)}`
			)
			.join(' ');

		return `
			<svg class="chart" preserveAspectRatio="none" viewBox="0 0 ${width} ${height}">
				${chart === 'area' ? `<polygon class="area" points="0,${height} ${line} ${width},${height}"></polygon>` : ''}
				<polyline class="line" points="${line}"></polyline>
			</svg>
		`;
	}

	function renderTrend(metric) {
		const percentage = metric.trend?.percentage;

		if (percentage === null || percentage === undefined) {
			return '';
		}

		const arrow = percentage > 0 ? '▲' : percentage < 0 ? '▼' : '■';

		// LDP already knows whether up is good for each metric: a rising bounce
		// rate comes back as NEGATIVE.

		const classification = (
			metric.trend.trendClassification || 'NEUTRAL'
		).toLowerCase();

		return `
			<span class="trend ${escape(classification)}">
				${arrow} ${Math.abs(percentage).toFixed(1)}%
			</span>
			<span class="muted">vs previous period</span>
		`;
	}

	function renderSeries(metric, format, chart) {
		if (!metric) {
			return EMPTY;
		}

		const points = metric.histogram?.metrics || [];

		const kpi = `
			<div class="kpi ${chart === 'number' ? 'large' : ''}">
				<span class="value">${formatValue(metric.value, format)}</span>
				${renderTrend(metric)}
			</div>
		`;

		if (chart === 'number' || points.length < 2) {
			return kpi;
		}

		return (
			kpi +
			renderSeriesPath(points, chart) +
			renderAxis(points[0].key.slice(0, 10), points.at(-1).key.slice(0, 10))
		);
	}

	function renderBars(items, format) {
		const max = Math.max(1, ...items.map(({value}) => value || 0));

		return `
			<ul class="bars">
				${items
					.map(
						({label, value}) => `
							<li>
								<div class="bar-label">
									<span title="${escape(label)}">${escape(label || 'Unknown')}</span>
									<span>${formatValue(value, format)}</span>
								</div>
								<div class="bar-track">
									<div class="bar-fill" style="width: ${(((value || 0) / max) * 100).toFixed(1)}%"></div>
								</div>
							</li>
						`
					)
					.join('')}
			</ul>
		`;
	}

	function renderColumns(items, format) {
		const max = Math.max(1, ...items.map(({value}) => value || 0));

		return `
			<div class="columns">
				${items
					.map(
						({label, value}) => `
							<div class="column-item" title="${escape(label)}: ${formatValue(value, format)}">
								<span class="column-value">${formatValue(value, format)}</span>
								<div class="column-bar" style="height: ${Math.max(((value || 0) / max) * 100, 2).toFixed(1)}%"></div>
								<span class="column-label">${escape(label || 'Unknown')}</span>
							</div>
						`
					)
					.join('')}
			</div>
		`;
	}

	function renderDonut(items, format) {
		const total = items.reduce((sum, {value}) => sum + (value || 0), 0);

		if (!total) {
			return EMPTY;
		}

		const radius = 15.9155;

		let offset = 25;

		const segments = items
			.map(({value}, index) => {
				const share = ((value || 0) / total) * 100;

				const segment = `<circle class="segment" cx="21" cy="21" fill="none" r="${radius}" stroke="${PALETTE[index % PALETTE.length]}" stroke-dasharray="${share.toFixed(3)} ${(100 - share).toFixed(3)}" stroke-dashoffset="${offset.toFixed(3)}" stroke-width="6"></circle>`;

				offset -= share;

				return segment;
			})
			.join('');

		return `
			<div class="donut">
				<svg viewBox="0 0 42 42">
					<circle cx="21" cy="21" fill="none" r="${radius}" stroke="#f1f2f5" stroke-width="6"></circle>
					${segments}
					<text class="donut-total" text-anchor="middle" x="21" y="23">${formatValue(total, format)}</text>
				</svg>
				<ul class="legend">
					${items
						.map(
							({label, value}, index) => `
								<li>
									<span class="swatch" style="background: ${PALETTE[index % PALETTE.length]}"></span>
									<span class="legend-label" title="${escape(label)}">${escape(label || 'Unknown')}</span>
									<span class="legend-value">${(((value || 0) / total) * 100).toFixed(0)}%</span>
								</li>
							`
						)
						.join('')}
				</ul>
			</div>
		`;
	}

	function renderItemsTable(items, format) {
		const total = items.reduce((sum, {value}) => sum + (value || 0), 0);

		return `
			<table class="table">
				<thead><tr><th>Name</th><th>Value</th><th>Share</th></tr></thead>
				<tbody>
					${items
						.map(
							({label, value}) => `
								<tr>
									<td title="${escape(label)}">${escape(label || 'Unknown')}</td>
									<td>${formatValue(value, format)}</td>
									<td>${total ? (((value || 0) / total) * 100).toFixed(1) : '0.0'}%</td>
								</tr>
							`
						)
						.join('')}
				</tbody>
			</table>
		`;
	}

	function renderItems(items, format, chart) {
		if (!items?.length) {
			return EMPTY;
		}

		if (chart === 'columns') {
			return renderColumns(items, format);
		}

		if (chart === 'donut') {
			return renderDonut(items, format);
		}

		if (chart === 'table') {
			return renderItemsTable(items, format);
		}

		return renderBars(items, format);
	}

	function renderPages(pages, chart) {
		if (!pages?.length) {
			return EMPTY;
		}

		if (chart === 'bars') {
			return renderBars(pages, 'number');
		}

		if (chart === 'columns') {
			return renderColumns(pages, 'number');
		}

		if (chart === 'donut') {
			return renderDonut(pages, 'number');
		}

		return `
			<table class="table">
				<thead><tr><th>Page</th><th>Visitors</th><th>Views</th><th>Entrances</th><th>Exit rate</th></tr></thead>
				<tbody>
					${pages
						.map(
							(page) => `
								<tr>
									<td title="${escape(page.label)}">${escape(page.label)}</td>
									<td>${formatValue(page.value, 'number')}</td>
									<td>${formatValue(page.views, 'number')}</td>
									<td>${formatValue(page.entrances, 'number')}</td>
									<td>${formatValue(page.exitRate, 'percent')}</td>
								</tr>
							`
						)
						.join('')}
				</tbody>
			</table>
		`;
	}

	// The heatmap's columns are days, with 0 for Sunday, and its rows are hours.

	const DAYS = [
		[1, 'Mon'],
		[2, 'Tue'],
		[3, 'Wed'],
		[4, 'Thu'],
		[5, 'Fri'],
		[6, 'Sat'],
		[0, 'Sun'],
	];

	function renderHeatmap(cells) {
		const grid = Array.from({length: 7}, () => Array(24).fill(0));

		// LDP answers in UTC; shift each cell to the viewer's time zone, as the
		// LDP screens do

		const offset = -new Date().getTimezoneOffset() / 60;

		for (const {colDimension, rowDimension, value} of cells || []) {
			const day = Number.parseInt(colDimension, 10);
			const hour = Number.parseInt(rowDimension, 10);

			if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
				const shifted = day * 24 + hour + offset;
				const index = ((Math.round(shifted) % 168) + 168) % 168;

				grid[Math.floor(index / 24)][index % 24] += value || 0;
			}
		}

		const max = Math.max(0, ...grid.flat());

		if (!max) {
			return EMPTY;
		}

		const hours = Array.from({length: 24}, (_, hour) => hour);

		return `
			<div class="heatmap">
				${DAYS.map(
					([day, label]) => `
						<span class="heatmap-day">${label}</span>
						${hours
							.map((hour) => {
								const value = grid[day][hour];

								return `<span class="heatmap-cell" style="background: color-mix(in srgb, var(--ldp-accent, #0b5fff) ${value ? Math.round(15 + (value / max) * 85) : 4}%, transparent)" title="${label} ${hour}:00: ${value}"></span>`;
							})
							.join('')}
					`
				).join('')}
				<span></span>
				${hours
					.map(
						(hour) =>
							`<span class="heatmap-hour">${hour % 6 ? '' : hour}</span>`
					)
					.join('')}
			</div>
		`;
	}

	function render(metric, result, chart) {
		if (metric.shape === 'series') {
			return renderSeries(result, metric.format, chart);
		}

		if (metric.shape === 'grid') {
			return renderHeatmap(result);
		}

		if (metric.shape === 'pages') {
			return renderPages(result, chart);
		}

		return renderItems(result, metric.format, chart);
	}

	const STYLE = `
		:host {
			display: block;
			font-family: var(--ldp-font, inherit);
		}

		.card {
			background: #fff;
			border: 1px solid var(--ldp-border, #e7e7ed);
			border-radius: var(--ldp-radius, 8px);
			box-shadow: var(--ldp-shadow, none);
			box-sizing: border-box;
			min-height: 220px;
			padding: 16px 20px;
			position: relative;
		}

		.header {
			align-items: flex-start;
			display: flex;
			gap: 12px;
			justify-content: space-between;
		}

		.chart-hint {
			background: #fff4e0;
			border-left: 3px solid #b95000;
			border-radius: 4px;
			color: #272833;
			font-size: 12px;
			margin-top: 12px;
			padding: 6px 10px;
		}

		.eyebrow,
		.muted,
		.axis,
		.status {
			color: var(--ldp-muted, #6b6c7e);
			font-size: 12px;
		}

		.title {
			color: var(--ldp-title, #272833);
			font-family: var(--ldp-heading-font, inherit);
			font-size: 16px;
			font-weight: 600;
			margin-top: 2px;
		}

		.cog {
			background: none;
			border: 0;
			border-radius: 4px;
			color: var(--ldp-muted, #6b6c7e);
			cursor: pointer;
			font-size: 18px;
			line-height: 1;
			padding: 4px 6px;
		}

		.cog:hover {
			background: var(--ldp-subtle, #f1f2f5);
			color: var(--ldp-text, #272833);
		}

		.kpi {
			align-items: baseline;
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			margin: 12px 0 8px;
		}

		.value {
			color: var(--ldp-text, #272833);
			font-size: 32px;
			font-weight: 600;
		}

		.kpi.large {
			margin: 32px 0;
		}

		.kpi.large .value {
			font-size: 48px;
		}

		.trend {
			font-size: 13px;
			font-weight: 600;
		}

		.trend.positive {
			color: #287d3c;
		}

		.trend.negative {
			color: #da1414;
		}

		.trend.neutral {
			color: var(--ldp-muted, #6b6c7e);
		}

		.chart {
			display: block;
			height: 80px;
			width: 100%;
		}

		.area {
			fill: var(--ldp-accent-soft, rgba(11, 95, 255, 0.12));
		}

		.line {
			fill: none;
			stroke: var(--ldp-accent, #0b5fff);
			stroke-width: 2;
			vector-effect: non-scaling-stroke;
		}

		.column {
			fill: var(--ldp-accent, #0b5fff);
		}

		.axis {
			display: flex;
			justify-content: space-between;
			margin-top: 4px;
		}

		.bars {
			list-style: none;
			margin: 12px 0 0;
			padding: 0;
		}

		.bars li {
			margin-bottom: 8px;
		}

		.bar-label {
			color: var(--ldp-text, #272833);
			display: flex;
			font-size: 13px;
			gap: 8px;
			justify-content: space-between;
		}

		.bar-label span:first-child,
		.legend-label,
		.table td:first-child {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.bar-track {
			background: var(--ldp-subtle, #f1f2f5);
			border-radius: 3px;
			height: 6px;
			margin-top: 3px;
		}

		.bar-fill {
			background: var(--ldp-accent, #0b5fff);
			border-radius: 3px;
			height: 6px;
		}

		.columns {
			align-items: stretch;
			display: flex;
			gap: 8px;
			height: 160px;
			margin-top: 12px;
		}

		.column-item {
			display: flex;
			flex: 1;
			flex-direction: column;
			justify-content: flex-end;
			min-width: 0;
		}

		.column-bar {
			background: var(--ldp-accent, #0b5fff);
			border-radius: 3px 3px 0 0;
		}

		.column-value,
		.column-label {
			color: var(--ldp-text, #272833);
			font-size: 11px;
			overflow: hidden;
			text-align: center;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.column-label {
			color: var(--ldp-muted, #6b6c7e);
			margin-top: 4px;
		}

		.donut {
			align-items: center;
			display: flex;
			gap: 20px;
			margin-top: 12px;
		}

		.donut svg {
			flex: 0 0 140px;
			height: 140px;
			width: 140px;
		}

		.donut-total {
			fill: var(--ldp-text, #272833);
			font-size: 6px;
			font-weight: 600;
		}

		.legend {
			flex: 1;
			list-style: none;
			margin: 0;
			min-width: 0;
			padding: 0;
		}

		.legend li {
			align-items: center;
			color: var(--ldp-text, #272833);
			display: flex;
			font-size: 13px;
			gap: 8px;
			margin-bottom: 6px;
		}

		.legend-label {
			flex: 1;
		}

		.swatch {
			border-radius: 2px;
			flex: 0 0 10px;
			height: 10px;
		}

		.table {
			border-collapse: collapse;
			font-size: 13px;
			margin-top: 12px;
			table-layout: fixed;
			width: 100%;
		}

		.table th {
			color: var(--ldp-muted, #6b6c7e);
			font-size: 11px;
			font-weight: 600;
			text-align: right;
			text-transform: uppercase;
		}

		.table th:first-child,
		.table td:first-child {
			text-align: left;
			width: 45%;
		}

		.table td {
			border-top: 1px solid var(--ldp-subtle, #f1f2f5);
			color: var(--ldp-text, #272833);
			padding: 6px 0;
			text-align: right;
		}

		.heatmap {
			display: grid;
			gap: 2px;
			grid-template-columns: 32px repeat(24, 1fr);
			margin-top: 12px;
		}

		.heatmap-cell {
			border-radius: 2px;
			height: 16px;
		}

		.heatmap-day,
		.heatmap-hour {
			color: var(--ldp-muted, #6b6c7e);
			font-size: 11px;
		}

		.empty,
		.error {
			font-size: 13px;
			margin: 24px 0;
		}

		.error {
			color: #da1414;
		}

		.status {
			display: flex;
			justify-content: space-between;
			margin-top: 8px;
		}

		.panel {
			background: #fff;
			border: 1px solid var(--ldp-border, #e7e7ed);
			border-radius: 8px;
			box-shadow: 0 4px 16px rgba(39, 40, 51, 0.16);
			box-sizing: border-box;
			display: none;
			padding: 16px;
			position: absolute;
			right: 12px;
			top: 44px;
			width: min(320px, calc(100% - 24px));
			z-index: 10;
		}

		.panel.open {
			display: block;
		}

		.panel label {
			color: var(--ldp-text, #272833);
			display: block;
			font-size: 12px;
			font-weight: 600;
			margin-bottom: 10px;
		}

		.panel input,
		.panel select {
			box-sizing: border-box;
			display: block;
			font: inherit;
			font-size: 13px;
			margin-top: 4px;
			padding: 4px 6px;
			width: 100%;
		}

		.panel label.check {
			align-items: center;
			display: flex;
			gap: 8px;
		}

		.panel label.check input {
			margin: 0;
			width: auto;
		}

		.insight {
			background: var(--ldp-subtle, #f1f2f5);
			border-radius: 8px;
			margin-top: 12px;
			padding: 10px 12px;
		}

		.spinner {
			animation: ldp-spin 0.8s linear infinite;
			border: 2px solid currentColor;
			border-radius: 50%;
			border-right-color: transparent;
			box-sizing: border-box;
			display: inline-block;
			height: 0.9em;
			margin-right: 6px;
			vertical-align: -0.1em;
			width: 0.9em;
		}

		@keyframes ldp-spin {
			to {
				transform: rotate(360deg);
			}
		}

		.insight-label {
			color: var(--ldp-accent, #0b5fff);
			font-size: 11px;
			font-weight: 700;
			letter-spacing: 0.06em;
			text-transform: uppercase;
		}

		.insight-text {
			color: var(--ldp-text, #272833);
			font-size: 13px;
			line-height: 1.5;
			margin: 4px 0 0;
		}

		.insight-error {
			color: var(--ldp-muted, #6b6c7e);
		}

		.dates {
			display: none;
			gap: 8px;
		}

		.dates.open {
			display: flex;
		}

		.dates label {
			flex: 1;
		}

		.hint {
			color: var(--ldp-muted, #6b6c7e);
			font-size: 11px;
			font-weight: 400;
		}

		.actions {
			display: flex;
			gap: 8px;
			justify-content: flex-end;
			margin-top: 12px;
		}

		.actions button {
			border: 1px solid var(--ldp-border-strong, #cdced9);
			border-radius: 4px;
			cursor: pointer;
			font: inherit;
			font-size: 13px;
			padding: 4px 12px;
		}

		.actions .primary {
			background: var(--ldp-accent, #0b5fff);
			border-color: var(--ldp-accent, #0b5fff);
			color: #fff;
		}
	`;

	function renderMetricOptions(selectedId) {
		const groups = [...new Set(CATALOG.map(({group}) => group))];

		return groups
			.map(
				(group) => `
					<optgroup label="${escape(group)}">
						${CATALOG.filter((metric) => metric.group === group)
							.map(
								({id, label}) =>
									`<option ${id === selectedId ? 'selected' : ''} value="${id}">${escape(label)}</option>`
							)
							.join('')}
					</optgroup>
				`
			)
			.join('');
	}

	function renderChartOptions(metric, selectedId) {
		return getCharts(metric)
			.map(
				({id, label}) =>
					`<option ${id === selectedId ? 'selected' : ''} value="${id}">${label}</option>`
			)
			.join('');
	}

	function renderRangeOptions(range) {
		const custom = Boolean(range.start && range.end);

		return (
			RANGES.map(
				({key, label}) =>
					`<option ${!custom && range.key === key ? 'selected' : ''} value="${key}">${label}</option>`
			).join('') +
			`<option ${custom ? 'selected' : ''} value="custom">Custom range</option>`
		);
	}

	class LdpMetricCard extends HTMLElement {
		async connectedCallback() {
			if (this.shadowRoot) {
				return;
			}

			this.attachShadow({mode: 'open'}).innerHTML =
				`<style>${STYLE}</style><div class="card"><div class="empty">Loading...</div></div>`;

			readPalette(this);

			this._key = getInstanceKey(this);

			this._config = (this._key && (await loadConfig(this._key))) || {
				...DEFAULT_CONFIG,
				metric: this.getAttribute('metric') || DEFAULT_CONFIG.metric,
			};

			this._render();
		}

		_canConfigure() {
			return Boolean(globalThis.Liferay?.ThemeDisplay?.isSignedIn());
		}

		_get(role) {
			return this.shadowRoot.querySelector(`[data-role="${role}"]`);
		}

		_render() {
			const metric = getMetric(this._config.metric);

			this.shadowRoot.innerHTML = `
				<style>${STYLE}</style>
				<div class="card">
					<div class="header">
						<div>
							<div class="eyebrow">LDP · ${escape(metric.group)}</div>
							<div class="title">${escape(this._config.title || metric.label)}</div>
						</div>
						${
							this._canConfigure()
								? '<button aria-label="Configure" class="cog" data-role="cog" title="Configure" type="button">⚙</button>'
								: ''
						}
					</div>
					<div data-role="body"><div class="empty">Loading...</div></div>
					${this._config.aiInsight ? '<div class="insight" data-role="insight"></div>' : ''}
					<div class="status">
						<span data-role="status"></span>
						<span class="save-status" data-role="save-status">${escape(this._saveStatus || '')}</span>
					</div>
					<div class="panel" data-role="panel"></div>
				</div>
			`;

			this._get('cog')?.addEventListener('click', () =>
				this._togglePanel()
			);

			this._load(metric);
		}

		async _load(metric) {
			const chart = getChart(metric, this._config.chart);
			const range = this._config.range;
			const startedAt = performance.now();

			try {
				const variables = getVariables(
					await getChannelId(),
					metric,
					range
				);

				const data = await runQuery(metric.query, variables);

				this._get('body').innerHTML = render(
					metric,
					metric.extract(data),
					chart
				);

				// In the page editor, say why a chart picked in the
				// configuration does not show up

				if (this._config.editing && this._config.chart && this._config.chart !== chart) {
					this._get('body').insertAdjacentHTML(
						'beforeend',
						`<div class="chart-hint">${escape(getChartLabel(this._config.chart))} is not available for ${escape(metric.label)}. Pick ${escape(new Intl.ListFormat('en', {type: 'disjunction'}).format(getCharts(metric).map(({label}) => label)))}.</div>`
					);
				}

				const rangeLabel =
					variables.rangeKey === 0
						? 'last 24 hours'
						: variables.rangeKey
							? `last ${variables.rangeKey} days`
							: `${variables.rangeStart} → ${variables.rangeEnd}`;

				this._get('status').textContent =
					`${rangeLabel} · ${Math.round(performance.now() - startedAt)} ms`;

				if (this._config.aiInsight) {
					this._loadInsight({
						data: compact(metric.extract(data)),
						group: metric.group,
						metric: this._config.title || metric.label,
						period: rangeLabel,
					});
				}
			}
			catch (error) {
				this._get('body').innerHTML =
					`<div class="error">${escape(error.message)}</div>`;
				this._get('status').textContent = '';
			}
		}

		async _loadInsight(metrics) {
			const key = JSON.stringify(metrics);

			if (this._insight?.key !== key || this._insight.status === 'error') {
				this._insight = {key, status: 'loading'};

				this._showInsight();

				try {
					this._insight = {
						key,
						status: 'done',
						text: await requestInsight(metrics),
					};
				}
				catch (error) {
					this._insight = {key, message: error.message, status: 'error'};
				}
			}

			if (this._insight.key === key) {
				this._showInsight();
			}
		}

		_showInsight() {
			const element = this._get('insight');

			if (element) {
				element.innerHTML = renderInsight(this._insight);
			}
		}

		_togglePanel() {
			const panel = this._get('panel');

			if (panel.classList.contains('open')) {
				panel.classList.remove('open');

				return;
			}

			const {metric, range, title} = this._config;

			const currentMetric = getMetric(metric);

			panel.innerHTML = `
				<label>
					Metric
					<select data-role="metric">${renderMetricOptions(metric)}</select>
				</label>
				<label>
					Chart
					<select data-role="chart">${renderChartOptions(currentMetric, getChart(currentMetric, this._config.chart))}</select>
				</label>
				<label>
					Period
					<select data-role="range">${renderRangeOptions(range)}</select>
					<span class="hint" data-role="range-hint"></span>
				</label>
				<div class="dates" data-role="dates">
					<label>From<input data-role="start" type="date" value="${escape(range.start || '')}" /></label>
					<label>To<input data-role="end" type="date" value="${escape(range.end || '')}" /></label>
				</div>
				<label>
					Title
					<input data-role="title" placeholder="${escape(currentMetric.label)}" type="text" value="${escape(title)}" />
				</label>
				<label class="check">
					<input ${this._config.aiInsight ? 'checked' : ''} data-role="ai-insight" type="checkbox" />
					Show AI insight
				</label>
				<div class="actions">
					<button data-role="cancel" type="button">Cancel</button>
					<button class="primary" data-role="apply" type="button">Apply</button>
				</div>
			`;

			const syncRange = () => {
				const selected = getMetric(this._get('metric').value);
				const rangeSelect = this._get('range');
				const customOption = rangeSelect.querySelector(
					'option[value="custom"]'
				);

				customOption.disabled = !selected.supportsCustomRange;

				if (customOption.disabled && rangeSelect.value === 'custom') {
					rangeSelect.value = '30';
				}

				this._get('range-hint').textContent =
					selected.supportsCustomRange
						? ''
						: 'This metric supports predefined periods only.';
				this._get('dates').classList.toggle(
					'open',
					rangeSelect.value === 'custom'
				);
				this._get('title').placeholder = selected.label;
			};

			const syncMetric = () => {
				const selected = getMetric(this._get('metric').value);
				const chartSelect = this._get('chart');

				chartSelect.innerHTML = renderChartOptions(
					selected,
					getChart(selected, chartSelect.value)
				);
				chartSelect.disabled = getCharts(selected).length === 1;

				syncRange();
			};

			this._get('metric').addEventListener('change', syncMetric);
			this._get('range').addEventListener('change', syncRange);
			this._get('cancel').addEventListener('click', () =>
				panel.classList.remove('open')
			);
			this._get('apply').addEventListener('click', () => this._apply());

			syncMetric();

			panel.classList.add('open');
		}

		_apply() {
			const rangeValue = this._get('range').value;

			let range = {key: Number(rangeValue)};

			if (rangeValue === 'custom') {
				const start = this._get('start').value;
				const end = this._get('end').value;

				if (!start || !end || start > end) {
					this._get('range-hint').textContent =
						'Pick a start date before the end date.';

					return;
				}

				range = {end, start};
			}

			this._config = {
				aiInsight: this._get('ai-insight').checked,
				chart: this._get('chart').value,
				metric: this._get('metric').value,
				range,
				title: this._get('title').value.trim(),
			};

			this._saveStatus = 'Saving...';

			this._render();
			this._save();
		}

		async _save() {
			if (!this._key) {
				this._saveStatus = 'Not saved: this card is not inside a widget.';
			}
			else {
				try {
					await saveConfig(this._key, this._config);

					this._saveStatus = 'Saved';
				}
				catch (error) {
					this._saveStatus = `Not saved: ${error.message}`;
				}
			}

			const status = this._get('save-status');

			if (status) {
				status.textContent = this._saveStatus;
			}
		}
	}

	if (!customElements.get('ldp-metric-card')) {
		customElements.define('ldp-metric-card', LdpMetricCard);
	}
})();
