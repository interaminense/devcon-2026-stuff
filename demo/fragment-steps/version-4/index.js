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

const AGENT_ERC = 'DEVCON_2026_DEMO_LDP_METRIC_INSIGHT';

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

async function queryLDP(body) {
	const {data, errors} = await api('/o/analytics-rest/v1.0/graphql', {
		body: JSON.stringify({
			query: `query ($channelId: String!, $rangeKey: Int) { ${body} }`,
			variables: {channelId: CHANNEL_ID, rangeKey: getRange().key},
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
		site(channelId: $channelId, interval: "${getRange().interval}", rangeKey: $rangeKey) {
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

function describe(widget, result) {
	const lines = [`metric: ${widget.label}`, `period: ${getRange().label.toLowerCase()}`];

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

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 1,
	notation: 'compact',
	roundingMode: 'trunc',
});

function formatValue(value, format) {
	if (value === null || value === undefined) {
		return '-';
	}

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

	const direction = getDirection(result);
	const arrow = percentage > 0 ? '▲' : percentage < 0 ? '▼' : '';
	const coloredArrow = arrow ? `<span class="${direction}">${arrow}</span>` : '';

	return `${coloredArrow} ${Math.abs(percentage).toFixed(1)}% vs previous period (${previous})`;
}

function formatDay(key) {
	if (getRange().interval === 'H') {
		return new Date(`${key}Z`).toLocaleTimeString('en-US', {hour: 'numeric'});
	}

	return new Date(`${key}Z`).toLocaleDateString('en-US', {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC',
	});
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

function renderSeries(result, format) {
	const days = result.histogram.metrics;
	const values = days.map(({value}) => value);
	const max = Math.max(...values);
	const min = Math.min(...values);
	const points = values.map((value, index) => [
		(index / (values.length - 1)) * 100,
		30 - ((value - min) / (max - min || 1)) * 26,
	]);
	const line = curve(points);

	const fade = `ldp-fade-${Math.random().toString(36).slice(2, 8)}`;
	const direction = getDirection(result);

	return `
		<div class="value">${formatValue(result.value, format)}</div>
		<div class="trend">${formatTrend(result, format)}</div>
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
		<div class="axis">
			<span>${formatDay(days[0].key)}</span>
			<span>${formatDay(days[days.length - 1].key)}</span>
		</div>
	`;
}

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

async function showInsight(root, widget, result) {
	const insight = root.querySelector('.insight');

	insight.innerHTML = '<span class="spinner" aria-hidden="true"></span>Asking AI Hub...';

	try {
		insight.textContent = await askAgent(describe(widget, result));
	}
	catch (error) {
		insight.textContent = `AI Hub is not available: ${error.message}`;
	}
}

async function render() {
	const metric = WIDGETS[configuration.metric] ? configuration.metric : 'visitorsMetric';
	const widget = WIDGETS[metric];
	const root = fragmentElement.querySelector('.ldp-fragment-card');

	root.innerHTML = `
		<div class="head">
			<strong>${widget.label}</strong>
			<span class="period">${getRange().label}</span>
		</div>
		<div class="body"><p class="status">Loading LDP data...</p></div>
		<button class="ai" hidden type="button">✦ AI insight</button>
		<p class="insight"></p>
	`;

	let result;

	try {
		result = widget.query ? await getItems(widget) : await getMetric(metric);
	}
	catch (error) {
		root.querySelector('.body').innerHTML =
			`<p class="status">Unable to load LDP data: ${escape(error.message)}</p>`;

		return;
	}

	root.querySelector('.body').innerHTML = widget.query
		? renderList(result)
		: renderSeries(result, widget.format);

	const button = root.querySelector('.ai');

	button.hidden = false;
	button.addEventListener('click', () => showInsight(root, widget, result));
}

render();
