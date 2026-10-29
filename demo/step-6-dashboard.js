// The LDP property (channel) of the Swell Lab site
const CHANNEL_ID = '845351493326064678';

// 7 = last 7 days (LDP leaves today out)
const RANGE_KEY = 7;

// The Liferay Object that keeps each card's configuration
const OBJECT_URL = '/o/c/democardconfigs';

// The AI Hub agent that writes the insight
const AGENT_ERC = 'DEVCON_2026_DEMO_LDP_METRIC_INSIGHT';

// Every widget a card can show. Site metrics come with a value, a trend and
// a daily chart; lists come with their top items. The key is what the Object
// stores, so the cards configured before keep working
const WIDGETS = {
	visitorsMetric: {group: 'Site', label: 'Unique visitors'},
	sessionsMetric: {group: 'Site', label: 'Sessions'},
	sessionsPerVisitorMetric: {group: 'Site', label: 'Sessions per visitor'},
	sessionDurationMetric: {
		format: 'duration',
		group: 'Site',
		label: 'Session duration',
	},
	bounceRateMetric: {format: 'percent', group: 'Site', label: 'Bounce rate'},
	topPages: {
		group: 'Lists',
		label: 'Top pages by views',
		query: `
			pages(
				channelId: $channelId
				rangeKey: $rangeKey
				size: 5
				sort: {column: "viewsMetric", type: DESC}
				start: 0
			) {
				assetMetrics {
					... on PageMetric {
						assetTitle
						viewsMetric {
							value
						}
					}
				}
			}
		`,
		toItems: (data) =>
			data.pages.assetMetrics.map((page) => ({
				label: page.assetTitle.split(' - ')[0],
				value: page.viewsMetric.value,
			})),
	},
	acquisitionChannel: {
		group: 'Lists',
		label: 'Acquisition by channel',
		query: `
			acquisitions(
				acquisitionType: CHANNEL
				channelId: $channelId
				rangeKey: $rangeKey
				size: 5
				start: 0
			) {
				compositions {
					count
					name
				}
			}
		`,
		toItems: (data) =>
			data.acquisitions.compositions.map(({count, name}) => ({
				label: name,
				value: count,
			})),
	},
	visitorsByDevice: {
		group: 'Lists',
		label: 'Visitors by device',
		query: `
			site(channelId: $channelId, rangeKey: $rangeKey) {
				visitorsMetric {
					device {
						value
						valueKey
					}
				}
			}
		`,
		toItems: (data) =>
			data.site.visitorsMetric.device.map(({value, valueKey}) => ({
				label: valueKey,
				value,
			})),
	},
};

const STYLE = `
	<style>
		.ldp-demo-card {
			background: var(--white);
			border: 1px solid var(--gray-300);
			border-radius: var(--border-radius-lg);
			box-shadow: var(--box-shadow-sm);
			box-sizing: border-box;
			color: var(--body-color);
			display: flex;
			flex-direction: column;
			font-family: var(--font-family-base);
			height: 100%;
			min-width: 0;
			padding: var(--spacer-4);
		}

		.ldp-demo-card .head {
			align-items: center;
			display: flex;
			gap: var(--spacer-2);
			justify-content: space-between;
		}

		.ldp-demo-card select {
			background: var(--white);
			border: 1px solid var(--gray-400);
			border-radius: var(--border-radius);
			color: var(--body-color);
			font: inherit;
			flex: 1;
			font-size: var(--font-size-sm);
			min-width: 0;
			padding: var(--spacer-1) var(--spacer-2);
		}

		.ldp-demo-card .period,
		.ldp-demo-card .status,
		.ldp-demo-card .axis {
			color: var(--secondary);
			font-size: var(--font-size-sm);
		}

		.ldp-demo-card .period {
			white-space: nowrap;
		}

		.ldp-demo-card .body {
			flex: 1;
		}

		.ldp-demo-card .value {
			color: var(--dark);
			font-size: 2.5rem;
			font-weight: 600;
			margin: var(--spacer-3) 0 var(--spacer-1);
		}

		.ldp-demo-card .trend {
			color: var(--secondary);
			font-size: var(--font-size-sm);
		}

		.ldp-demo-card .chart {
			color: var(--secondary);
			display: block;
			height: 96px;
			margin-top: var(--spacer-3);
			width: 100%;
		}

		.ldp-demo-card .chart polyline {
			fill: none;
			stroke: currentColor;
			stroke-linejoin: round;
			stroke-width: 2;
			vector-effect: non-scaling-stroke;
		}

		.ldp-demo-card .chart polygon {
			fill: currentColor;
			opacity: 0.12;
		}

		.ldp-demo-card .axis {
			display: flex;
			justify-content: space-between;
			margin-top: var(--spacer-1);
		}

		.ldp-demo-card .up {
			color: var(--success);
		}

		.ldp-demo-card .down {
			color: var(--danger);
		}

		.ldp-demo-card .list {
			display: grid;
			gap: var(--spacer-2);
			list-style: none;
			margin: var(--spacer-3) 0 0;
			padding: 0;
		}

		.ldp-demo-card .list li {
			align-items: center;
			display: grid;
			font-size: var(--font-size-sm);
			gap: var(--spacer-2);
			grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) 3.5em;
		}

		.ldp-demo-card .list .name {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.ldp-demo-card .list .bar {
			background: var(--gray-200);
			border-radius: var(--border-radius);
			height: 8px;
			overflow: hidden;
		}

		.ldp-demo-card .list .bar span {
			background: var(--primary);
			display: block;
			height: 100%;
		}

		.ldp-demo-card .list .count {
			color: var(--dark);
			font-weight: 600;
			text-align: right;
		}

		.ldp-demo-card .ai {
			align-self: flex-start;
			background: var(--primary);
			border: 0;
			border-radius: var(--border-radius);
			color: var(--white);
			cursor: pointer;
			font: inherit;
			font-size: var(--font-size-sm);
			margin-top: var(--spacer-3);
			padding: var(--spacer-1) var(--spacer-3);
		}

		.ldp-demo-card .ai:hover {
			background: var(--primary-d1);
		}

		.ldp-demo-card .insight {
			background: var(--primary-l3);
			border-left: 3px solid var(--primary);
			border-radius: var(--border-radius);
			color: var(--body-color);
			font-size: var(--font-size-sm);
			line-height: 1.5;
			margin: var(--spacer-3) 0 0;
			padding: var(--spacer-2) var(--spacer-3);
		}

		.ldp-demo-card .insight:empty {
			display: none;
		}
	</style>
`;

async function api(url, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			'x-csrf-token': Liferay.authToken,
		},
	});

	if (!response.ok) {
		throw new Error(`${url} returned ${response.status}`);
	}

	return response.json();
}

// The DXP proxies the request to LDP with the user's session: no LDP token in
// the browser
async function queryLDP(body) {
	const {data, errors} = await api('/o/analytics-rest/v1.0/graphql', {
		body: JSON.stringify({
			query: `query ($channelId: String!, $rangeKey: Int) { ${body} }`,
			variables: {channelId: CHANNEL_ID, rangeKey: RANGE_KEY},
		}),
		method: 'POST',
	});

	if (errors) {
		throw new Error(errors[0].message);
	}

	return data;
}

async function getMetric(metric) {
	const data = await queryLDP(`
		site(channelId: $channelId, interval: "D", rangeKey: $rangeKey) {
			${metric} {
				histogram {
					metrics {
						key
						value
					}
				}
				previousValue
				trend {
					percentage
					trendClassification
				}
				value
			}
		}
	`);

	return data.site[metric];
}

async function getItems(widget) {
	const data = await queryLDP(widget.query);

	return widget.toItems(data).sort((a, b) => b.value - a.value);
}

// Each widget instance has its own portlet id, the same on the draft and the
// published page: it is the key of the card's entry in the Object
function getKey(element) {
	const wrapper = element.closest('[id^="p_p_id_"]');

	return wrapper.id.replace(/^p_p_id_/, '').replace(/_$/, '');
}

async function loadConfig(key) {
	try {
		const entry = await api(`${OBJECT_URL}/by-external-reference-code/${key}`);

		return WIDGETS[entry.metric] ? {metric: entry.metric} : null;
	}
	catch {

		// 404: this card was never configured

		return null;
	}
}

function saveConfig(key, config) {

	// PUT by external reference code creates the entry the first time and
	// replaces it afterwards

	return api(`${OBJECT_URL}/by-external-reference-code/${key}`, {
		body: JSON.stringify(config),
		method: 'PUT',
	});
}

// AI Hub: the DXP issues a token, the browser subscribes to AI Hub's event
// stream, starts the agent with the stream key, and reads the answer from the
// event named after the agent
async function askAgent(text) {
	const token = await api('/o/ai-hub-cell/v1.0/authorization-tokens', {
		method: 'POST',
	});

	const stream = await fetch(
		`${token.serviceURL}/o/ai-hub/v1.0/agent-instances/subscribe`,
		{
			headers: {
				Accept: 'text/event-stream',
				Authorization: `Bearer ${token.accessToken}`,
			},
		}
	);

	const reader = stream.body.getReader();
	const decoder = new TextDecoder();

	let buffer = '';

	while (true) {
		const {done, value} = await reader.read();

		if (done) {
			throw new Error('AI Hub closed the stream.');
		}

		buffer += decoder.decode(value, {stream: true});

		let end;

		while ((end = buffer.indexOf('\n\n')) >= 0) {
			const block = buffer.slice(0, end);

			buffer = buffer.slice(end + 2);

			const name = block.match(/^event: ?(.*)$/m)?.[1];
			const data = block.match(/^data: ?(.*)$/m)?.[1];

			if (name === 'Subscribe') {
				await fetch(`${token.serviceURL}/o/ai-hub/v1.0/agent-instances`, {
					body: JSON.stringify({
						agentDefinitionExternalReferenceCode: AGENT_ERC,
						context: {metrics: text},
						sseEventSinkKey: data,
					}),
					headers: {
						'Authorization': `Bearer ${token.accessToken}`,
						'Content-Type': 'application/json',
						'Liferay-AI-Hub-Cell-On-Behalf-Of': token.userToken,
					},
					method: 'POST',
				});
			}
			else if (name === AGENT_ERC) {
				reader.cancel();

				return JSON.parse(data).data;
			}
		}
	}
}

// Plain text lines: the firewall in front of AI Hub rejects nested JSON
function describe(widget, result) {
	const lines = [`metric: ${widget.label}`, 'period: last 7 days'];

	if (Array.isArray(result)) {
		return [
			...lines,
			...result.map(({label, value}) => `${label}: ${value}`),
		].join('\n');
	}

	return [
		...lines,
		`value: ${formatValue(result.value, widget.format)}`,
		`previous period value: ${formatValue(result.previousValue, widget.format)}`,
		`change: ${result.trend?.percentage ?? 'n/a'}%`,
	].join('\n');
}

// Same format as LDP: at most one decimal, truncated, and 1.2K from a thousand
const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 1,
	notation: 'compact',
	roundingMode: 'trunc',
});

function formatValue(value, format) {
	if (value === null || value === undefined) {
		return '-';
	}

	// Bounce rate is a ratio and session duration is in milliseconds

	if (format === 'percent') {
		return `${NUMBER_FORMAT.format(value * 100)}%`;
	}

	if (format === 'duration') {
		const minutes = Math.floor(value / 60000);
		const seconds = Math.floor((value % 60000) / 1000);

		return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
	}

	return NUMBER_FORMAT.format(value);
}

function escape(text) {
	const element = document.createElement('span');

	element.textContent = text;

	return element.innerHTML;
}

// LDP says whether a change is good or bad: a higher bounce rate goes red
function getDirection(result) {
	const classification = result.trend?.trendClassification;

	return classification === 'POSITIVE'
		? 'up'
		: classification === 'NEGATIVE'
			? 'down'
			: '';
}

function formatTrend(result, format) {
	const percentage = result.trend?.percentage;
	const previous = formatValue(result.previousValue, format);

	if (percentage === null || percentage === undefined) {
		return `Previous period: ${previous}`;
	}

	const arrow = percentage > 0 ? '▲' : percentage < 0 ? '▼' : '';

	return `${arrow} ${Math.abs(percentage).toFixed(1)}% vs previous period (${previous})`;
}

function formatDay(key) {
	return new Date(`${key}Z`).toLocaleDateString('en-US', {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC',
	});
}

// An area chart of the daily values, colored by the trend, with the first
// and the last day under it
function renderSeries(result, format) {
	const days = result.histogram.metrics;
	const values = days.map(({value}) => value);
	const max = Math.max(...values);
	const min = Math.min(...values);
	const points = values
		.map((value, index) => {
			const x = (index / (values.length - 1)) * 100;
			const y = 30 - ((value - min) / (max - min || 1)) * 26;

			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(' ');
	const direction = getDirection(result);

	return `
		<div class="value">${formatValue(result.value, format)}</div>
		<div class="trend ${direction}">${formatTrend(result, format)}</div>
		<svg class="chart ${direction}" preserveAspectRatio="none" viewBox="0 0 100 32">
			<polygon points="0,32 ${points} 100,32"/>
			<polyline points="${points}"/>
		</svg>
		<div class="axis">
			<span>${formatDay(days[0].key)}</span>
			<span>${formatDay(days[days.length - 1].key)}</span>
		</div>
	`;
}

// A row per item, with a bar relative to the biggest one
function renderList(items) {
	if (!items.length) {
		return '<p class="status">No data for this period.</p>';
	}

	const max = items[0].value || 1;

	return `
		<ol class="list">
			${items
				.map(
					({label, value}) => `
						<li>
							<span class="name" title="${escape(label)}">${escape(label)}</span>
							<span class="bar"><span style="width: ${(value / max) * 100}%"></span></span>
							<span class="count">${formatValue(value)}</span>
						</li>
					`
				)
				.join('')}
		</ol>
	`;
}

function renderOptions(selected) {
	const groups = {};

	for (const [id, {group, label}] of Object.entries(WIDGETS)) {
		groups[group] = `${groups[group] || ''}<option ${id === selected ? 'selected' : ''} value="${id}">${label}</option>`;
	}

	return Object.entries(groups)
		.map(([group, options]) => `<optgroup label="${group}">${options}</optgroup>`)
		.join('');
}

class LdpDemoCard extends HTMLElement {
	config = {metric: 'visitorsMetric'};

	async connectedCallback() {
		// DXP can connect the same card twice while the page loads: set it up
		// only once
		if (this.ready) {
			return;
		}

		this.ready = true;

		this.classList.add('ldp-demo-card');

		this.key = getKey(this);
		this.config = (await loadConfig(this.key)) || this.config;

		this.render();
	}

	async render() {
		const widget = WIDGETS[this.config.metric];

		this.innerHTML = `
			${STYLE}
			<div class="head">
				<select>${renderOptions(this.config.metric)}</select>
				<span class="period">Last 7 days</span>
			</div>
			<div class="body"><p class="status">Loading LDP data...</p></div>
			<button class="ai" hidden type="button">✦ AI insight</button>
			<p class="insight"></p>
		`;

		this.querySelector('select').addEventListener('change', (event) => {
			this.config = {metric: event.target.value};

			saveConfig(this.key, this.config);

			this.render();
		});

		let result;

		try {
			result = widget.query
				? await getItems(widget)
				: await getMetric(this.config.metric);
		}
		catch (error) {
			this.querySelector('.body').innerHTML =
				`<p class="status">Unable to load LDP data: ${escape(error.message)}</p>`;

			return;
		}

		this.querySelector('.body').innerHTML = widget.query
			? renderList(result)
			: renderSeries(result, widget.format);

		const button = this.querySelector('.ai');

		button.hidden = false;

		button.addEventListener('click', async () => {
			const insight = this.querySelector('.insight');

			insight.textContent = 'Asking AI Hub...';

			try {
				insight.textContent = await askAgent(describe(widget, result));
			}
			catch (error) {
				insight.textContent = `AI Hub is not available: ${error.message}`;
			}
		});
	}
}

customElements.define('ldp-demo-card', LdpDemoCard);
