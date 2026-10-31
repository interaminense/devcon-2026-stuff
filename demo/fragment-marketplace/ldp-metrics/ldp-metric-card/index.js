const RANGES = {
	0: 'Last 24 hours',
	7: 'Last 7 days',
	30: 'Last 30 days',
	90: 'Last 90 days',
};

const METRICS = {
	sessionsMetric: 'Sessions',
	sessionsPerVisitorMetric: 'Sessions per visitor',
	visitorsMetric: 'Unique visitors',
};

const AGENT_TIMEOUT = 60000;

class FriendlyError extends Error {
	constructor(title, detail) {
		super(detail);

		this.title = title;
	}
}

function getRange() {
	const key = RANGES[configuration.range] ? Number(configuration.range) : 7;

	return {interval: key === 0 ? 'H' : 'D', key, label: RANGES[key]};
}

function getMetricKey() {
	return METRICS[configuration.metric] ? configuration.metric : 'visitorsMetric';
}

function isAIInsightEnabled() {
	return configuration.aiInsight === true || configuration.aiInsight === 'true';
}

async function api(url, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			'x-csrf-token': Liferay.authToken,
		},
	});

	return {
		body: response.ok ? await response.json() : null,
		status: response.status,
	};
}

async function findChannel(channelId) {
	for (let page = 1; ; page++) {
		const response = await api(
			`/o/analytics-settings-rest/v1.0/channels?page=${page}&pageSize=100`
		).catch(() => ({status: 0}));

		if (response.status !== 200) {
			return null;
		}

		const {items = [], lastPage = 1} = response.body;

		if (items.some((channel) => channel.channelId === channelId)) {
			return true;
		}

		if (page >= lastPage) {
			return false;
		}
	}
}

async function getMetric() {
	const channelId = (configuration.channelId || '').trim();

	if (!channelId) {
		throw new FriendlyError(
			'Connect this card to Liferay Data Platform',
			'Set the LDP channel ID in the fragment configuration.'
		);
	}

	const metric = getMetricKey();

	const query = `
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

	let channel;
	let response;

	try {
		[channel, response] = await Promise.all([findChannel(channelId), api('/o/analytics-rest/v1.0/graphql', {
			body: JSON.stringify({
				query,
				variables: {channelId, rangeKey: getRange().key},
			}),
			method: 'POST',
		})]);
	}
	catch (error) {
		throw new FriendlyError(
			'Liferay Data Platform is not reachable',
			'Check the connection and try again in a moment.'
		);
	}

	if (response.status === 401 || response.status === 403) {
		throw new FriendlyError(
			'LDP data is not available for you',
			'Sign in with a user who can view Liferay Data Platform data.'
		);
	}

	if (response.status === 404) {
		throw new FriendlyError(
			'This site is not connected to Liferay Data Platform',
			'Connect the instance to LDP in Instance Settings > Analytics Cloud.'
		);
	}

	if (channel === false) {
		throw new FriendlyError(
			'The LDP channel was not found',
			`There is no channel with the ID "${channelId}" in the connected LDP workspace. Check the LDP channel ID in the fragment configuration.`
		);
	}

	const result = response.body?.data?.site?.[metric];

	if (response.status !== 200 || response.body?.errors?.length || !result) {
		throw new FriendlyError(
			'LDP did not return data for this card',
			'Make sure the LDP channel ID is correct and that the channel is connected to this site.'
		);
	}

	return result;
}

async function getAgentToken() {
	let response;

	try {
		response = await api('/o/ai-hub-cell/v1.0/authorization-tokens', {
			method: 'POST',
		});
	}
	catch (error) {
		response = {status: 0};
	}

	if (response.status === 401 || response.status === 403) {
		throw new FriendlyError(
			'AI insights are not available for you',
			'Sign in with a user who can use AI Hub.'
		);
	}

	if (!response.body?.accessToken) {
		throw new FriendlyError(
			'AI Hub is not available',
			'This instance is not connected to AI Hub, so the card shows the metric without an insight.'
		);
	}

	return response.body;
}

async function startAgent(token, agentERC, text, sinkKey) {
	const response = await fetch(`${token.serviceURL}/o/ai-hub/v1.0/agent-instances`, {
		body: JSON.stringify({
			agentDefinitionExternalReferenceCode: agentERC,
			context: {metrics: text},
			sseEventSinkKey: sinkKey,
		}),
		headers: {
			'Accept': 'application/json',
			'Authorization': `Bearer ${token.accessToken}`,
			'Content-Type': 'application/json',
			'Liferay-AI-Hub-Cell-On-Behalf-Of': token.userToken,
		},
		method: 'POST',
	});

	if (response.status === 404) {
		throw new FriendlyError(
			'The AI Hub agent was not found',
			`There is no agent with the ERC "${agentERC}". Check the AI Hub agent ERC in the fragment configuration.`
		);
	}

	if (!response.ok) {
		throw new FriendlyError(
			'AI Hub could not start the agent',
			'Try again in a moment.'
		);
	}
}

async function readAnswer(token, agentERC, text, signal) {
	const stream = await fetch(
		`${token.serviceURL}/o/ai-hub/v1.0/agent-instances/subscribe`,
		{
			headers: {
				Accept: 'text/event-stream',
				Authorization: `Bearer ${token.accessToken}`,
			},
			signal,
		}
	);

	if (!stream.ok) {
		throw new FriendlyError('AI Hub is not available', 'Try again in a moment.');
	}

	const reader = stream.body.getReader();
	const decoder = new TextDecoder();

	let buffer = '';

	while (true) {
		const {done, value} = await reader.read();

		if (done) {
			throw new FriendlyError('AI Hub did not answer', 'Try again in a moment.');
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
				await startAgent(token, agentERC, text, data);
			}
			else if (name === agentERC) {
				reader.cancel();

				return JSON.parse(data).data;
			}
			else if (name === 'Agent Invocation Failed') {
				throw new FriendlyError(
					'The AI Hub agent could not answer',
					'Check the agent workflow in AI Hub and try again.'
				);
			}
		}
	}
}

async function askAgent(text) {
	const agentERC = (configuration.agentERC || '').trim();

	if (!agentERC) {
		throw new FriendlyError(
			'Choose the AI Hub agent',
			'Set the AI Hub agent ERC in the fragment configuration.'
		);
	}

	const token = await getAgentToken();

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT);

	try {
		return await readAnswer(token, agentERC, text, controller.signal);
	}
	catch (error) {
		if (error instanceof FriendlyError) {
			throw error;
		}

		if (error.name === 'AbortError') {
			throw new FriendlyError('AI Hub took too long to answer', 'Try again in a moment.');
		}

		throw new FriendlyError(
			'AI Hub is not available',
			'This instance could not reach AI Hub. Check the AI Hub connection and try again.'
		);
	}
	finally {
		clearTimeout(timer);

		controller.abort();
	}
}

function describe(result) {
	return [
		`metric: ${METRICS[getMetricKey()]}`,
		`period: ${getRange().label.toLowerCase()}`,
		`value: ${result.value}`,
		`previous period value: ${result.previousValue}`,
		`change: ${result.trend?.percentage ?? 'n/a'}%`,
	].join('\n');
}

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 1,
	notation: 'compact',
	roundingMode: 'trunc',
});

function formatValue(value) {
	return NUMBER_FORMAT.format(value);
}

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

function renderChart(result) {
	const values = (result.histogram?.metrics || []).map(({value}) => value);

	if (values.length < 2) {
		return '';
	}

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

function showNotice(root, error) {
	const notice = root.querySelector('.notice');

	const title = document.createElement('strong');

	title.textContent = error instanceof FriendlyError ? error.title : 'Something went wrong';

	notice.replaceChildren(
		title,
		error instanceof FriendlyError ? error.message : 'Reload the page and try again.'
	);
	notice.hidden = false;
}

async function showInsight(root, result) {
	const insight = root.querySelector('.insight');

	insight.innerHTML = '<span class="spinner" aria-hidden="true"></span>Asking AI Hub...';

	try {
		insight.textContent = await askAgent(describe(result));
	}
	catch (error) {
		insight.textContent = '';

		showNotice(root, error);
	}
}

async function render() {
	const root = fragmentElement.querySelector('.ldp-fragment-card');

	root.querySelector('.card-title').textContent = `${METRICS[getMetricKey()]} · ${getRange().label}`;

	let result;

	try {
		result = await getMetric();
	}
	catch (error) {
		root.classList.add('is-unavailable');

		showNotice(root, error);

		return;
	}

	root.querySelector('.value').textContent = formatValue(result.value);
	root.querySelector('.trend').innerHTML = formatTrend(result);
	root.querySelector('.chart-slot').innerHTML = renderChart(result);

	if (isAIInsightEnabled()) {
		await showInsight(root, result);
	}
}

render();
