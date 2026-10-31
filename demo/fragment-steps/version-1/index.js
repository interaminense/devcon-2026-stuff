const CHANNEL_ID = '845351493326064678';
const RANGE_KEY = 7;

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
				site(channelId: $channelId, interval: "D", rangeKey: $rangeKey) {
					${metric} {
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
		variables: {channelId: CHANNEL_ID, rangeKey: RANGE_KEY},
	});
}

function formatValue(value) {
	const numberFormat = new Intl.NumberFormat('en-US', {
		maximumFractionDigits: 1,
		notation: 'compact',
		roundingMode: 'trunc',
	});

	return numberFormat.format(value);
}

function formatTrend(result) {
	const percentage = result.trend?.percentage;

	if (percentage === null || percentage === undefined) {
		return `Previous period: ${formatValue(result.previousValue)}`;
	}

	const arrow = percentage > 0 ? '<span class="up">▲</span>' : percentage < 0 ? '<span class="down">▼</span>' : '';

	return `${arrow} ${Math.abs(percentage).toFixed(1)}% vs previous period (${formatValue(result.previousValue)})`;
}

async function showMetric(root, metric) {
	const {data} = await fetchLDPData(metric);

	const result = data.site[metric];

	root.querySelector('.value').textContent = formatValue(result.value);
	root.querySelector('.trend').innerHTML = formatTrend(result);
}

async function render() {
	const root = fragmentElement.querySelector('.ldp-fragment-card');

	await showMetric(root, 'visitorsMetric');
}

render();
