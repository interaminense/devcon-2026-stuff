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

const METRICS = {
	sessionsPerVisitorMetric: 'Sessions per visitor',
	visitorsMetric: 'Unique visitors',
};

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
`;

const result = await getMetric(configuration.metric);

root.querySelector('.value').textContent = formatValue(result.value);
root.querySelector('.trend').textContent = formatTrend(result);
root.querySelector('.chart-slot').innerHTML = renderChart(result);
