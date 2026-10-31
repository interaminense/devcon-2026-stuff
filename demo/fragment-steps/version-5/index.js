const CHANNEL_ID = '845351493326064678';

const RANGES = {
	0: 'Last 24 hours',
	7: 'Last 7 days',
	30: 'Last 30 days',
	90: 'Last 90 days',
};

function getRange() {
	const key = RANGES[configuration.range] ? Number(configuration.range) : 7;

	return {interval: key === 0 ? 'H' : 'D', key, label: RANGES[key]};
}

const ALERT_URL = '/o/c/insightalerts';

const AGENT_ERC = 'DEVCON_2026_DEMO_LDP_METRIC_INSIGHT';

const METRICS = {
	sessionsPerVisitorMetric: 'Sessions per visitor',
	visitorsMetric: 'Unique visitors',
};

async function fetchData(url, body) {
	const response = await fetch(url, {
		body: JSON.stringify(body),
		headers: {
			'Content-Type': 'application/json',
			'x-csrf-token': Liferay.authToken,
		},
		method: 'POST',
	});

	if (!response.ok) {
		throw new Error(`${url} returned ${response.status}`);
	}

	return response.json();
}

async function fetchLDPData(metric) {
	function buildQuery(metric) {
		return `
			query ($channelId: String!, $rangeKey: Int) {
				site(channelId: $channelId, interval: "${getRange().interval}", rangeKey: $rangeKey) {
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
	}

	return fetchData('/o/analytics-rest/v1.0/graphql', {
		query: buildQuery(metric),
		variables: {channelId: CHANNEL_ID, rangeKey: getRange().key},
	});
}

function readEvent(block) {
	return {
		data: block.match(/^data: ?(.*)$/m)?.[1],
		name: block.match(/^event: ?(.*)$/m)?.[1],
	};
}

function startAgent(token, sinkKey, text) {
	return fetch(`${token.serviceURL}/o/ai-hub/v1.0/agent-instances`, {
		body: JSON.stringify({
			agentDefinitionExternalReferenceCode: AGENT_ERC,
			context: {metrics: text},
			sseEventSinkKey: sinkKey,
		}),
		headers: {
			'Authorization': `Bearer ${token.accessToken}`,
			'Content-Type': 'application/json',
			'Liferay-AI-Hub-Cell-On-Behalf-Of': token.userToken,
		},
		method: 'POST',
	});
}

async function askAgent(text) {
	const token = await fetchData('/o/ai-hub-cell/v1.0/authorization-tokens');

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

		const blocks = buffer.split('\n\n');

		buffer = blocks.pop();

		for (const {data, name} of blocks.map(readEvent)) {
			if (name === 'Subscribe') {
				await startAgent(token, data, text);
			}
			else if (name === AGENT_ERC) {
				reader.cancel();

				return JSON.parse(data).data;
			}
		}
	}
}

function notifyMarketingTeam(label, text) {
	return fetchData(ALERT_URL, {
		insight: text,
		metric: label,
		page: window.location.pathname,
		period: getRange().label,
	});
}

function describe(label, result) {
	return [
		`metric: ${label}`,
		`period: ${getRange().label.toLowerCase()}`,
		`value: ${result.value}`,
		`previous period value: ${result.previousValue}`,
		`change: ${result.trend?.percentage ?? 'n/a'}%`,
	].join('\n');
}

function formatValue(value) {
	const numberFormat = new Intl.NumberFormat('en-US', {
		maximumFractionDigits: 1,
		notation: 'compact',
		roundingMode: 'trunc',
	});

	return numberFormat.format(value);
}

function renderChart(result) {
	function curve(points) {
		const ys = points.map(([, y]) => y);
		const clamp = (y) => Math.min(Math.max(y, Math.min(...ys)), Math.max(...ys));

		return points
			.map(([x, y], index) => {
				if (index === 0) {
					return `M${x.toFixed(1)},${y.toFixed(1)}`;
				}

				const [x0, y0] = points[index - 2] || points[index - 1];
				const [x1, y1] = points[index - 1];
				const [x3, y3] = points[index + 1] || [x, y];

				return `C${(x1 + (x - x0) / 6).toFixed(1)},${clamp(y1 + (y - y0) / 6).toFixed(1)} ${(x - (x3 - x1) / 6).toFixed(1)},${clamp(y - (y3 - y1) / 6).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	}

	const values = result.histogram.metrics.map(({value}) => value);
	const max = Math.max(...values);
	const min = Math.min(...values);
	const points = values.map((value, index) => [
		(index / (values.length - 1)) * 100,
		28 - ((value - min) / (max - min || 1)) * 24,
	]);
	const line = curve(points);

	const fade = `ldp-fade-${Math.random().toString(36).slice(2, 8)}`;
	const percentage = result.trend?.percentage;
	const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : '';

	return `
		<svg class="chart ${direction}" preserveAspectRatio="none" viewBox="0 0 100 32">
			<defs>
				<linearGradient id="${fade}" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stop-color="currentColor" stop-opacity="0.35"/>
					<stop offset="1" stop-color="currentColor" stop-opacity="0"/>
				</linearGradient>
			</defs>
			<path d="${line} L100,32 L0,32 Z" fill="url(#${fade})"/>
			<path class="line" d="${line}"/>
		</svg>
	`;
}

function formatTrend(result) {
	const percentage = result.trend?.percentage;

	if (percentage === null || percentage === undefined) {
		return `Previous period: ${formatValue(result.previousValue)}`;
	}

	const arrow = percentage > 0 ? '<span class="up">▲</span>' : percentage < 0 ? '<span class="down">▼</span>' : '';

	return `${arrow} ${Math.abs(percentage).toFixed(1)}% vs previous period (${formatValue(result.previousValue)})`;
}

async function showInsight(root, result) {
	const insight = root.querySelector('.insight');
	const notify = root.querySelector('.notify');

	insight.innerHTML = '<span class="spinner" aria-hidden="true"></span>Asking AI Hub...';
	notify.hidden = true;

	try {
		insight.textContent = await askAgent(
			describe(METRICS[configuration.metric], result)
		);
		root.querySelector('.ai').hidden = true;
		notify.disabled = false;
		notify.textContent = '📣 Notify marketing team';
		notify.hidden = false;
	}
	catch (error) {
		insight.textContent = `AI Hub is not available: ${error.message}`;
	}
}

async function shareInsight(root) {
	const notify = root.querySelector('.notify');

	notify.disabled = true;
	notify.textContent = 'Notifying...';

	try {
		await notifyMarketingTeam(
			METRICS[configuration.metric],
			root.querySelector('.insight').textContent
		);
		notify.textContent = '✓ Marketing team notified';
	}
	catch (error) {
		notify.disabled = false;
		notify.textContent = `Try again (${error.message})`;
	}
}

async function showMetric(root, metric) {
	const {data} = await fetchLDPData(metric);

	const result = data.site[metric];

	root.querySelector('.value').textContent = formatValue(result.value);
	root.querySelector('.trend').innerHTML = formatTrend(result);
	root.querySelector('.chart-slot').innerHTML = renderChart(result);

	return result;
}

async function render() {
	const root = fragmentElement.querySelector('.ldp-fragment-card');

	root.querySelector('.card-title').textContent = `${METRICS[configuration.metric]} · ${getRange().label}`;

	const result = await showMetric(root, configuration.metric);

	root.querySelector('.ai').addEventListener('click', () => showInsight(root, result));
	root.querySelector('.notify').addEventListener('click', () => shareInsight(root));
}

render();
