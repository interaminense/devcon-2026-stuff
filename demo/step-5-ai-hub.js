// The LDP property (channel) of the Swell Lab site
const CHANNEL_ID = '845351493326064678';

// 7 = last 7 days (LDP leaves today out)
const RANGE_KEY = 7;

// The Liferay Object that keeps each card's configuration
const OBJECT_URL = '/o/c/democardconfigs';

// The AI Hub agent that writes the insight
const AGENT_ERC = 'DEVCON_2026_DEMO_LDP_METRIC_INSIGHT';

const METRICS = {
	sessionsPerVisitorMetric: 'Sessions per visitor',
	visitorsMetric: 'Unique visitors',
};

const STYLE = `
	<style>
		.ldp-demo-card {
			background: var(--white);
			border: 1px solid var(--gray-300);
			border-radius: var(--border-radius-lg);
			box-shadow: var(--box-shadow-sm);
			color: var(--body-color);
			display: block;
			font-family: var(--font-family-base);
			padding: var(--spacer-4);
		}

		.ldp-demo-card select {
			background: var(--white);
			border: 1px solid var(--gray-400);
			border-radius: var(--border-radius);
			color: var(--body-color);
			font: inherit;
			font-size: var(--font-size-sm);
			padding: var(--spacer-1) var(--spacer-2);
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
			display: block;
			height: 48px;
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

		.ldp-demo-card .up {
			color: var(--success);
		}

		.ldp-demo-card .down {
			color: var(--danger);
		}

		.ldp-demo-card .ai {
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

async function getMetric(metric) {
	const query = `
		query ($channelId: String!, $rangeKey: Int) {
			site(channelId: $channelId, interval: "D", rangeKey: $rangeKey) {
				${metric} {
					histogram {
						metrics {
							value
						}
					}
					previousValue
					trend {
						percentage
					}
					value
				}
			}
		}
	`;

	// The DXP proxies the request to LDP with the user's session: no LDP
	// token in the browser
	const {data} = await api('/o/analytics-rest/v1.0/graphql', {
		body: JSON.stringify({
			query,
			variables: {channelId: CHANNEL_ID, rangeKey: RANGE_KEY},
		}),
		method: 'POST',
	});

	return data.site[metric];
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

		return {metric: entry.metric};
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
function describe(label, result) {
	return [
		`metric: ${label}`,
		'period: last 7 days',
		`value: ${result.value}`,
		`previous period value: ${result.previousValue}`,
		`change: ${result.trend?.percentage ?? 'n/a'}%`,
	].join('\n');
}

// Same format as LDP: at most one decimal, truncated, and 1.2K from a thousand
const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 1,
	notation: 'compact',
	roundingMode: 'trunc',
});

function formatValue(value) {
	return NUMBER_FORMAT.format(value);
}

// A mini line chart of the daily values, colored by the trend
function renderChart(result) {
	const values = result.histogram.metrics.map(({value}) => value);
	const max = Math.max(...values);
	const min = Math.min(...values);
	const points = values
		.map((value, index) => {
			const x = (index / (values.length - 1)) * 100;
			const y = 28 - ((value - min) / (max - min || 1)) * 24;

			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(' ');
	const percentage = result.trend?.percentage;
	const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : '';

	return `<svg class="chart ${direction}" preserveAspectRatio="none" viewBox="0 0 100 32"><polyline points="${points}"/></svg>`;
}

function formatTrend(result) {
	const percentage = result.trend?.percentage;

	if (percentage === null || percentage === undefined) {
		return `Previous period: ${formatValue(result.previousValue)}`;
	}

	const arrow = percentage > 0 ? '▲' : percentage < 0 ? '▼' : '';

	return `${arrow} ${Math.abs(percentage).toFixed(1)}% vs previous period (${formatValue(result.previousValue)})`;
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
		const options = Object.entries(METRICS)
			.map(
				([value, label]) =>
					`<option ${value === this.config.metric ? 'selected' : ''} value="${value}">${label}</option>`
			)
			.join('');

		this.innerHTML = `
			${STYLE}
			<select>${options}</select>
			<div class="value">...</div>
			<div class="trend">Last 7 days</div>
			<div class="chart-slot"></div>
			<button class="ai" type="button">✦ AI insight</button>
			<p class="insight"></p>
		`;

		this.querySelector('select').addEventListener('change', (event) => {
			this.config = {metric: event.target.value};

			saveConfig(this.key, this.config);

			this.render();
		});

		const result = await getMetric(this.config.metric);

		this.querySelector('.value').textContent = formatValue(result.value);
		this.querySelector('.trend').textContent = formatTrend(result);
		this.querySelector('.chart-slot').innerHTML = renderChart(result);

		this.querySelector('.ai').addEventListener('click', async () => {
			const insight = this.querySelector('.insight');

			insight.textContent = 'Asking AI Hub...';

			try {
				insight.textContent = await askAgent(
					describe(METRICS[this.config.metric], result)
				);
			}
			catch (error) {
				insight.textContent = `AI Hub is not available: ${error.message}`;
			}
		});
	}
}

customElements.define('ldp-demo-card', LdpDemoCard);
