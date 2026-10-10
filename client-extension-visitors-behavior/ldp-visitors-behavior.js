// Visitors Behavior card: the six page metrics of LDP for the whole site, as
// tabs with their trend, and a smooth line of the selected metric below. The
// selected tab and the period are kept in the LDPMetricCard Object.

(() => {
	const GRAPHQL_URL = '/o/analytics-rest/v1.0/graphql';

	const OBJECT_URL = '/o/c/ldpmetriccards';

	// Site metrics only, as on the Sites screen of LDP: each visitor and
	// session counts once. Page metrics belong to the live page views card.

	const METRICS = [
		{format: 'number', id: 'visitorsMetric', label: 'Unique Visitors'},
		{format: 'number', id: 'sessionsMetric', label: 'Sessions'},
		{format: 'ratio', id: 'sessionsPerVisitorMetric', label: 'Sessions/Visitor'},
		{format: 'duration', id: 'sessionDurationMetric', label: 'Session Duration'},
		{format: 'percent', id: 'bounceRateMetric', label: 'Bounce Rate'},
	];

	const RANGES = [
		{key: 0, label: 'Last 24 hours'},
		{key: 7, label: 'Last 7 days'},
		{key: 30, label: 'Last 30 days'},
		{key: 90, label: 'Last 90 days'},
	];

	const DEFAULT_CONFIG = {metric: METRICS[0].id, rangeKey: 0};

	const QUERY = `
		query VisitorsBehavior($channelId: String!, $interval: String!, $rangeKey: Int) {
			site(channelId: $channelId, interval: $interval, rangeKey: $rangeKey) {
				${METRICS.map(
					({id}) => `
						${id} {
							histogram {
								metrics {
									key
									value
								}
							}
							trend {
								percentage
								trendClassification
							}
							value
						}
					`
				).join('')}
			}
		}
	`;

	const WIDTH = 1000;
	const HEIGHT = 220;
	const PADDING = {bottom: 28, left: 44, right: 12, top: 16};

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
			padding: 20px 24px 16px;
		}

		.header {
			align-items: flex-start;
			display: flex;
			gap: 12px;
			justify-content: space-between;
		}

		.eyebrow,
		.status {
			color: var(--ldp-muted, #6b6c7e);
			font-size: 12px;
		}

		.title {
			color: var(--ldp-title, #272833);
			font-family: var(--ldp-heading-font, inherit);
			font-size: 18px;
			font-weight: 600;
			margin-top: 2px;
		}

		select {
			background: var(--ldp-subtle, #f1f2f5);
			border: 1px solid transparent;
			border-radius: 8px;
			color: var(--ldp-text, #272833);
			cursor: pointer;
			font: inherit;
			font-size: 13px;
			padding: 6px 10px;
		}

		select:focus,
		select:hover {
			border-color: var(--ldp-accent, #0b5fff);
			outline: none;
		}

		.tabs {
			display: grid;
			gap: 4px;
			grid-template-columns: repeat(5, minmax(0, 1fr));
			margin: 16px 0 8px;
		}

		.tab {
			background: none;
			border: 0;
			border-bottom: 3px solid transparent;
			border-radius: 0;
			color: var(--ldp-muted, #6b6c7e);
			cursor: pointer;
			font: inherit;
			padding: 8px 4px 10px;
			text-align: left;
		}

		.tab:hover {
			background: var(--ldp-subtle, #f1f2f5);
		}

		.tab[aria-selected='true'] {
			border-bottom-color: var(--ldp-accent, #0b5fff);
			color: var(--ldp-text, #272833);
		}

		.tab-label {
			display: block;
			font-size: 14px;
			font-weight: 600;
			white-space: nowrap;
		}

		.tab-value {
			color: var(--ldp-text, #272833);
			display: block;
			font-family: var(--ldp-heading-font, inherit);
			font-size: 28px;
			font-weight: 700;
			line-height: 1.3;
		}

		.tab[aria-selected='false'] .tab-value {
			color: var(--ldp-muted, #6b6c7e);
		}

		.unit {
			font-size: 14px;
			font-weight: 600;
			margin-left: 1px;
		}

		.trend {
			font-size: 12px;
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

		.chart-label {
			color: var(--ldp-muted, #6b6c7e);
			font-size: 13px;
			margin: 8px 0 4px;
		}

		.chart {
			position: relative;
		}

		svg {
			display: block;
			height: auto;
			overflow: visible;
			width: 100%;
		}

		.grid line {
			stroke: var(--ldp-border-strong, #e7e7ed);
			stroke-width: 1;
		}

		.grid text,
		.axis text {
			fill: var(--ldp-muted, #6b6c7e);
			font-size: 12px;
		}

		.area {
			fill: var(--ldp-accent-soft, rgba(11, 95, 255, 0.12));
		}

		.line {
			fill: none;
			stroke: var(--ldp-accent, #0b5fff);
			stroke-linecap: round;
			stroke-linejoin: round;
			stroke-width: 2.5;
			vector-effect: non-scaling-stroke;
		}

		.crosshair {
			stroke: var(--ldp-muted, #6b6c7e);
			stroke-width: 1;
			vector-effect: non-scaling-stroke;
		}

		.marker {
			fill: var(--ldp-accent, #0b5fff);
			stroke: #fff;
			stroke-width: 2;
			vector-effect: non-scaling-stroke;
		}

		.tooltip {
			background: var(--ldp-text, #272833);
			border-radius: 6px;
			color: #fff;
			font-size: 12px;
			padding: 4px 8px;
			pointer-events: none;
			position: absolute;
			transform: translate(-50%, -130%);
			white-space: nowrap;
		}

		.empty,
		.error {
			color: var(--ldp-muted, #6b6c7e);
			padding: 48px 0;
			text-align: center;
		}

		.error {
			color: #da1414;
		}

		.status {
			margin-top: 6px;
		}

		.sr-only {
			clip: rect(0 0 0 0);
			height: 1px;
			overflow: hidden;
			position: absolute;
			width: 1px;
		}

		@media (max-width: 760px) {
			.tabs {
				grid-template-columns: repeat(3, minmax(0, 1fr));
			}
		}
	`;

	async function request(url, options = {}) {
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				'x-csrf-token': Liferay.authToken,
			},
		});

		if (!response.ok) {
			const error = new Error(`${url} returned ${response.status}`);

			error.status = response.status;

			throw error;
		}

		return response.status === 204 ? null : response.json();
	}

	let channelIdPromise;

	function getChannelId() {
		if (!channelIdPromise) {
			const groupId = Number(Liferay.ThemeDisplay.getScopeGroupId());

			channelIdPromise = request(
				'/o/analytics-settings-rest/v1.0/channels?pageSize=200'
			)
				.then((page) => {
					const channel = (page.items || []).find((item) =>
						(item.dataSources || []).some((dataSource) =>
							(dataSource.siteIds || []).map(Number).includes(groupId)
						)
					);

					if (!channel) {
						throw new Error('This site is not assigned to an LDP property.');
					}

					return channel.channelId;
				})
				.catch((error) => {
					channelIdPromise = null;

					throw error;
				});
		}

		return channelIdPromise;
	}

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

			return {
				metric: METRICS.some(({id}) => id === entry.chart)
					? entry.chart
					: DEFAULT_CONFIG.metric,
				rangeKey: entry.rangeKey ?? DEFAULT_CONFIG.rangeKey,
			};
		}
		catch (error) {
			if (error.status !== 404) {
				console.warn('[ldp-visitors-behavior] Unable to load the configuration', error);
			}

			return null;
		}
	}

	function saveConfig(key, {metric, rangeKey}) {
		return request(getEntryURL(key), {
			body: JSON.stringify({
				chart: metric,
				metric: 'visitorsBehavior',
				rangeKey,
				title: 'Visitors Behavior',
			}),
			method: 'PUT',
		});
	}

	function formatValue(value, format) {
		if (value === null || value === undefined || Number.isNaN(value)) {
			return {number: '-', unit: ''};
		}

		if (format === 'percent') {
			return {number: Math.round(value * 1000) / 10, unit: '%'};
		}

		if (format === 'ratio') {
			return {number: Math.round(value * 10) / 10, unit: ''};
		}

		if (format === 'duration') {
			const seconds = Math.round(value / 1000);

			if (seconds < 60) {
				return {number: seconds, unit: 's'};
			}

			const minutes = Math.floor(seconds / 60);

			return {
				number: `${minutes}m ${String(seconds % 60).padStart(2, '0')}`,
				unit: 's',
			};
		}

		return {number: (Math.round(value * 10) / 10).toLocaleString(), unit: ''};
	}

	function formatText(value, format) {
		const {number, unit} = formatValue(value, format);

		return `${number}${unit}`;
	}

	function formatKey(key) {

		// Hourly buckets come as UTC "YYYY-MM-DDTHH:00", daily ones as dates

		if (key.includes('T')) {
			return new Date(`${key}:00Z`).toLocaleString([], {
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				month: 'short',
			});
		}

		return new Date(`${key.slice(0, 10)}T00:00:00`).toLocaleDateString([], {
			day: '2-digit',
			month: 'short',
		});
	}

	function renderTrend(trend) {
		const percentage = trend?.percentage ?? 0;
		const classification = (trend?.trendClassification || 'NEUTRAL').toLowerCase();
		const arrow = percentage > 0 ? '▲ ' : percentage < 0 ? '▼ ' : '';

		return `<span class="trend ${classification}">${arrow}${Math.abs(Math.round(percentage * 10) / 10)}%</span>`;
	}

	function niceMax(value) {
		if (value <= 0) {
			return 1;
		}

		const magnitude = 10 ** Math.floor(Math.log10(value));

		for (const step of [1, 2, 2.5, 5, 10]) {
			if (step * magnitude >= value) {
				return step * magnitude;
			}
		}

		return 10 * magnitude;
	}

	// A Catmull-Rom spline through the points, drawn as cubic Bézier curves,
	// gives the line its wave shape while still passing through every value

	function smoothPath(points) {
		if (points.length < 2) {
			return points.length ? `M${points[0].x},${points[0].y}` : '';
		}

		let path = `M${points[0].x},${points[0].y}`;

		for (let index = 0; index < points.length - 1; index++) {
			const previous = points[index - 1] || points[index];
			const current = points[index];
			const next = points[index + 1];
			const after = points[index + 2] || next;

			const control1 = {
				x: current.x + (next.x - previous.x) / 6,
				y: current.y + (next.y - previous.y) / 6,
			};
			const control2 = {
				x: next.x - (after.x - current.x) / 6,
				y: next.y - (after.y - current.y) / 6,
			};

			path += ` C${control1.x},${Math.min(control1.y, PADDING.top + chartHeight())},${control2.x},${Math.min(control2.y, PADDING.top + chartHeight())},${next.x},${next.y}`;
		}

		return path;
	}

	function chartHeight() {
		return HEIGHT - PADDING.top - PADDING.bottom;
	}

	function chartWidth() {
		return WIDTH - PADDING.left - PADDING.right;
	}

	function getPoints(metrics) {
		const max = niceMax(Math.max(0, ...metrics.map(({value}) => value)));
		const step = metrics.length > 1 ? chartWidth() / (metrics.length - 1) : 0;

		return {
			max,
			points: metrics.map(({key, value}, index) => ({
				key,
				value,
				x: Math.round((PADDING.left + index * step) * 10) / 10,
				y: Math.round((PADDING.top + chartHeight() - (value / max) * chartHeight()) * 10) / 10,
			})),
		};
	}

	function renderChart(metric, metrics) {
		if (!metrics.length) {
			return '<div class="empty">No data for this period.</div>';
		}

		const {max, points} = getPoints(metrics);
		const baseline = PADDING.top + chartHeight();
		const line = smoothPath(points);
		const area = `${line} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`;

		const ticks = [0, 0.5, 1]
			.map((ratio) => {
				const y = PADDING.top + chartHeight() - ratio * chartHeight();

				return `
					<line x1="${PADDING.left}" x2="${WIDTH - PADDING.right}" y1="${y}" y2="${y}" />
					<text text-anchor="end" x="${PADDING.left - 8}" y="${y + 4}">${formatText(max * ratio, metric.format)}</text>
				`;
			})
			.join('');

		const middle = points[Math.floor(points.length / 2)];

		const labels = [points[0], middle, points[points.length - 1]]
			.map(
				(point, index) =>
					`<text text-anchor="${['start', 'middle', 'end'][index]}" x="${point.x}" y="${HEIGHT - 6}">${formatKey(point.key)}</text>`
			)
			.join('');

		return `
			<div class="chart" data-role="chart">
				<svg aria-label="${metric.label} over time" role="img" viewBox="0 0 ${WIDTH} ${HEIGHT}">
					<g class="grid">${ticks}</g>
					<path class="area" d="${area}" />
					<path class="line" d="${line}" />
					<g class="axis">${labels}</g>
					<line class="crosshair" data-role="crosshair" visibility="hidden" x1="0" x2="0" y1="${PADDING.top}" y2="${baseline}" />
					<circle class="marker" data-role="marker" r="5" visibility="hidden" />
					<rect data-role="hit" fill="transparent" height="${HEIGHT}" width="${WIDTH}" x="0" y="0" />
				</svg>
				<div class="tooltip" data-role="tooltip" hidden></div>
			</div>
			<table class="sr-only">
				<caption>${metric.label}</caption>
				<tbody>
					${metrics.map(({key, value}) => `<tr><th scope="row">${formatKey(key)}</th><td>${formatText(value, metric.format)}</td></tr>`).join('')}
				</tbody>
			</table>
		`;
	}

	class LdpVisitorsBehavior extends HTMLElement {
		async connectedCallback() {
			if (this.shadowRoot) {
				return;
			}

			this.attachShadow({mode: 'open'}).innerHTML =
				`<style>${STYLE}</style><div class="card"><div class="empty">Loading...</div></div>`;

			this._key = getInstanceKey(this);
			this._config = (this._key && (await loadConfig(this._key))) || {
				...DEFAULT_CONFIG,
			};

			this.shadowRoot.addEventListener('click', (event) => {
				const tab = event.target.closest('[data-metric]');

				if (tab) {
					this._update({metric: tab.dataset.metric});
				}
			});

			this.shadowRoot.addEventListener('change', (event) => {
				if (event.target.name === 'rangeKey') {
					this._update({rangeKey: Number(event.target.value)});
				}
			});

			this.shadowRoot.addEventListener('pointermove', (event) => this._hover(event));
			this.shadowRoot.addEventListener('pointerleave', () => this._hover(null), true);

			this._load();
		}

		async _load() {
			const startedAt = performance.now();

			this._data = null;
			this._error = null;

			this._render();

			try {
				const {data, errors} = await request(GRAPHQL_URL, {
					body: JSON.stringify({
						query: QUERY,
						variables: {
							channelId: await getChannelId(),
							interval: this._config.rangeKey === 0 ? 'H' : 'D',
							rangeKey: this._config.rangeKey,
						},
					}),
					method: 'POST',
				});

				if (errors?.length) {
					throw new Error(errors[0].message);
				}

				this._data = data.site || {};
				this._elapsed = Math.round(performance.now() - startedAt);
			}
			catch (error) {
				console.error(error);

				this._error = error.message;
			}

			this._render();
		}

		_update(change) {
			const previous = this._config;

			this._config = {...this._config, ...change};

			if (change.rangeKey !== undefined) {
				this._load();
			}
			else {
				this._render();
			}

			if (this._key) {
				saveConfig(this._key, this._config).catch((error) => {
					console.warn('[ldp-visitors-behavior] Unable to save the configuration', error);

					this._config = previous;
				});
			}
		}

		_hover(event) {
			const chart = this.shadowRoot.querySelector('[data-role="chart"]');

			if (!chart || !this._points) {
				return;
			}

			const crosshair = chart.querySelector('[data-role="crosshair"]');
			const marker = chart.querySelector('[data-role="marker"]');
			const tooltip = chart.querySelector('[data-role="tooltip"]');

			const svg = chart.querySelector('svg');
			const box = svg.getBoundingClientRect();

			if (!event || !event.composedPath().includes(svg)) {
				crosshair.setAttribute('visibility', 'hidden');
				marker.setAttribute('visibility', 'hidden');
				tooltip.hidden = true;

				return;
			}

			const x = ((event.clientX - box.left) / box.width) * WIDTH;

			const point = this._points.reduce((closest, candidate) =>
				Math.abs(candidate.x - x) < Math.abs(closest.x - x) ? candidate : closest
			);

			crosshair.setAttribute('x1', point.x);
			crosshair.setAttribute('x2', point.x);
			crosshair.setAttribute('visibility', 'visible');

			marker.setAttribute('cx', point.x);
			marker.setAttribute('cy', point.y);
			marker.setAttribute('visibility', 'visible');

			const metric = METRICS.find(({id}) => id === this._config.metric);

			tooltip.textContent = `${formatKey(point.key)} · ${formatText(point.value, metric.format)}`;
			tooltip.style.left = `${(point.x / WIDTH) * 100}%`;
			tooltip.style.top = `${(point.y / HEIGHT) * box.height}px`;
			tooltip.hidden = false;
		}

		_render() {
			const metric = METRICS.find(({id}) => id === this._config.metric) || METRICS[0];
			const range = RANGES.find(({key}) => key === this._config.rangeKey) || RANGES[0];

			const tabs = METRICS.map((item) => {
				const data = this._data?.[item.id];
				const {number, unit} = formatValue(data?.value, item.format);

				return `
					<button aria-selected="${item.id === metric.id}" class="tab" data-metric="${item.id}" role="tab" type="button">
						<span class="tab-label">${item.label}</span>
						<span class="tab-value">${this._data ? number : '–'}<span class="unit">${this._data ? unit : ''}</span></span>
						${this._data ? renderTrend(data?.trend) : '<span class="trend neutral">&nbsp;</span>'}
					</button>
				`;
			}).join('');

			const histogram = this._data?.[metric.id]?.histogram?.metrics || [];

			this._points = histogram.length ? getPoints(histogram).points : null;

			const body = this._error
				? `<div class="error">Could not load LDP data: ${this._error}</div>`
				: this._data
					? renderChart(metric, histogram)
					: '<div class="empty">Loading...</div>';

			this.shadowRoot.innerHTML = `
				<style>${STYLE}</style>
				<section class="card">
					<div class="header">
						<div>
							<div class="eyebrow">LDP · Site</div>
							<div class="title">Visitors Behavior</div>
						</div>
						<select aria-label="Period" name="rangeKey">
							${RANGES.map(({key, label}) => `<option ${key === range.key ? 'selected' : ''} value="${key}">${label}</option>`).join('')}
						</select>
					</div>
					<div class="tabs" role="tablist">${tabs}</div>
					<div class="chart-label">${metric.label}</div>
					${body}
					<div class="status">${range.label.toLowerCase()}${this._elapsed ? ` · ${this._elapsed} ms` : ''}</div>
				</section>
			`;
		}
	}

	if (!customElements.get('ldp-visitors-behavior')) {
		customElements.define('ldp-visitors-behavior', LdpVisitorsBehavior);
	}
})();
