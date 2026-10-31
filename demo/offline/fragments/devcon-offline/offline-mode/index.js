const AI_HUB_URL = 'https://ai-hub.offline';

const BASE = {
	sessionsMetric: 2470,
	sessionsPerVisitorMetric: 1.9,
	visitorsMetric: 1284,
};

const LABELS = {
	sessionsMetric: 'sessions',
	sessionsPerVisitorMetric: 'sessions per visitor',
	visitorsMetric: 'unique visitors',
};

function json(body) {
	return new Response(JSON.stringify(body), {
		headers: {'Content-Type': 'application/json'},
		status: 200,
	});
}

function wave(seed, index) {
	return 1 + 0.18 * Math.sin(seed + index * 0.9) + 0.08 * Math.cos(seed * 2 + index * 2.3);
}

function fakeMetric(metric, rangeKey, hourly) {
	const points = hourly ? 24 : Math.max(rangeKey, 7);
	const days = Math.max(rangeKey, 1);
	const base = BASE[metric] ?? 100;
	const ratio = metric === 'sessionsPerVisitorMetric';
	const scale = ratio ? 1 : days / 7;
	const seed = metric.length + rangeKey;
	const round = (value) => (ratio ? Math.round(value * 100) / 100 : Math.round(value));

	const values = Array.from({length: points}, (_, index) =>
		round(((base * scale) / (ratio ? 1 : points)) * wave(seed, index))
	);

	const value = ratio ? round(base * (1 + rangeKey / 400)) : values.reduce((sum, item) => sum + item, 0);
	const previousValue = round(value / (1 + (0.08 + (seed % 5) * 0.04) * (seed % 2 ? -1 : 1)));

	return {
		histogram: {metrics: values.map((item) => ({value: item}))},
		previousValue,
		trend: {percentage: Math.round(((value - previousValue) / previousValue) * 1000) / 10},
		value,
	};
}

function answerLDP(body) {
	const {query, variables = {}} = JSON.parse(body || '{}');
	const metric = query.match(/site\s*\([^)]*\)\s*{\s*(\w+)/)?.[1] || 'visitorsMetric';
	const hourly = /interval:\s*"H"/.test(query);

	return json({
		data: {site: {[metric]: fakeMetric(metric, Number(variables.rangeKey ?? 7), hourly)}},
	});
}

function writeInsight(text) {
	const field = (name) => text.match(new RegExp(`^${name}: (.*)$`, 'm'))?.[1] || '';
	const change = Number.parseFloat(field('change'));
	const metric = field('metric').toLowerCase() || 'this metric';
	const period = field('period') || 'the selected period';

	if (Number.isNaN(change)) {
		return `Over the ${period}, ${metric} reached ${field('value')}. There is no earlier period to compare yet, so keep tracking it for a few more days.`;
	}

	const direction = change >= 0 ? 'grew' : 'dropped';
	const advice = change >= 0
		? 'Find the pages and campaigns behind the growth and give them more visibility on the home page.'
		: 'Review the campaigns that ended in this period and refresh the content on the most visited pages.';

	return `Over the ${period}, ${metric} ${direction} ${Math.abs(change)}% compared to the previous period (${field('previous period value')}). ${advice}`;
}

function startOfflineAIHub() {
	const streams = [];

	function subscribe() {
		const encoder = new TextEncoder();

		const body = new ReadableStream({
			start(controller) {
				streams.push(controller);
				controller.enqueue(encoder.encode('event: Subscribe\ndata: offline-sink\n\n'));
			},
		});

		return new Response(body, {
			headers: {'Content-Type': 'text/event-stream'},
			status: 200,
		});
	}

	function startAgent(body) {
		const {agentDefinitionExternalReferenceCode, context = {}} = JSON.parse(body || '{}');
		const controller = streams.pop();
		const answer = JSON.stringify({data: writeInsight(Object.values(context).join('\n'))});

		setTimeout(() => {
			try {
				controller?.enqueue(
					new TextEncoder().encode(`event: ${agentDefinitionExternalReferenceCode}\ndata: ${answer}\n\n`)
				);
			}
			catch (error) {
				console.warn('Offline AI Hub stream already closed', error);
			}
		}, 1500);

		return json({});
	}

	return {startAgent, subscribe};
}

function installOfflineMode() {
	if (window.__devconOffline) {
		return;
	}

	window.__devconOffline = true;

	const realFetch = window.fetch.bind(window);
	const aiHub = startOfflineAIHub();

	window.fetch = async (input, options = {}) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url.includes('/o/analytics-rest/v1.0/graphql')) {
			return answerLDP(options.body);
		}

		if (url.includes('/o/ai-hub-cell/v1.0/authorization-tokens')) {
			return json({accessToken: 'offline', serviceURL: AI_HUB_URL, userToken: 'offline'});
		}

		if (url.startsWith(`${AI_HUB_URL}/o/ai-hub/v1.0/agent-instances/subscribe`)) {
			return aiHub.subscribe();
		}

		if (url.startsWith(`${AI_HUB_URL}/o/ai-hub/v1.0/agent-instances`)) {
			return aiHub.startAgent(options.body);
		}

		return realFetch(input, options);
	};
}

installOfflineMode();

if (layoutMode === 'edit') {
	fragmentElement.querySelector('.offline-mode').classList.add('is-visible');
}
