// The LDP property (channel) of the Swell Lab site
const CHANNEL_ID = '845351493326064678';

const RANGES = {
	0: 'Last 24 hours',
	7: 'Last 7 days',
	30: 'Last 30 days',
	90: 'Last 90 days',
};

// The fragment configuration picks the range of each instance too. LDP
// leaves today out of the day ranges, and answers the last 24 hours per hour
const RANGE_KEY = RANGES[configuration.range] ? Number(configuration.range) : 7;
const RANGE_LABEL = RANGES[RANGE_KEY];
const INTERVAL = RANGE_KEY === 0 ? 'H' : 'D';

// The AI Hub agent that writes the insight
const AGENT_ERC = 'DEVCON_2026_DEMO_LDP_METRIC_INSIGHT';

const METRICS = {
	sessionsPerVisitorMetric: 'Sessions per visitor',
	visitorsMetric: 'Unique visitors',
};

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
			site(channelId: $channelId, interval: "${INTERVAL}", rangeKey: $rangeKey) {
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
		`period: ${RANGE_LABEL.toLowerCase()}`,
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

// The fragment configuration picks the metric of each instance, in the page
// editor, and saves it with the page
const root = fragmentElement.querySelector('.ldp-fragment-card');

root.innerHTML = `
	<strong>${METRICS[configuration.metric]} · ${RANGE_LABEL}</strong>
	<div class="value">...</div>
	<div class="trend">Last 7 days</div>
	<div class="chart-slot"></div>
	<button class="ai" type="button">✦ AI insight</button>
	<p class="insight"></p>
`;

const result = await getMetric(configuration.metric);

root.querySelector('.value').textContent = formatValue(result.value);
root.querySelector('.trend').textContent = formatTrend(result);
root.querySelector('.chart-slot').innerHTML = renderChart(result);

root.querySelector('.ai').addEventListener('click', async () => {
	const insight = root.querySelector('.insight');

	insight.innerHTML = '<span class="spinner" aria-hidden="true"></span>Asking AI Hub...';

	try {
		insight.textContent = await askAgent(
			describe(METRICS[configuration.metric], result)
		);
	}
	catch (error) {
		insight.textContent = `AI Hub is not available: ${error.message}`;
	}
});
