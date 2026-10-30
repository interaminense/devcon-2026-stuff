const CHANNEL_ID = '845351493326064678';

const RANGE_KEY = 7;

const METRICS = {
	sessionsPerVisitorMetric: 'Sessions per visitor',
	visitorsMetric: 'Unique visitors',
};

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

	const response = await fetch('/o/analytics-rest/v1.0/graphql', {
		body: JSON.stringify({
			query,
			variables: {channelId: CHANNEL_ID, rangeKey: RANGE_KEY},
		}),
		headers: {
			'Content-Type': 'application/json',
			'x-csrf-token': Liferay.authToken,
		},
		method: 'POST',
	});

	const {data} = await response.json();

	return data.site[metric];
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

function renderOptions(select) {
	select.innerHTML = Object.entries(METRICS)
		.map(([value, label]) => `<option value="${value}">${label}</option>`)
		.join('');
	select.value = 'visitorsMetric';
}

async function showMetric(root, metric) {
	const result = await getMetric(metric);

	root.querySelector('.value').textContent = formatValue(result.value);
	root.querySelector('.trend').innerHTML = formatTrend(result);
	root.querySelector('.chart-slot').innerHTML = renderChart(result);
}

async function render() {
	const root = fragmentElement.querySelector('.ldp-fragment-card');
	const select = root.querySelector('.metric');

	renderOptions(select);
	select.addEventListener('change', () => showMetric(root, select.value));

	await showMetric(root, select.value);
}

render();
