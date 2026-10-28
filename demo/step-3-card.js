// The LDP property (channel) of the Swell Lab site
const CHANNEL_ID = '845351493326064678';

// 7 = last 7 days (LDP leaves today out)
const RANGE_KEY = 7;

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
	</style>
`;

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

class LdpDemoCard extends HTMLElement {
	config = {metric: 'visitorsMetric'};

	connectedCallback() {
		// DXP can connect the same card twice while the page loads: set it up
		// only once
		if (this.ready) {
			return;
		}

		this.ready = true;

		this.classList.add('ldp-demo-card');

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
		`;

		this.querySelector('select').addEventListener('change', (event) => {
			this.config = {metric: event.target.value};

			this.render();
		});

		const result = await getMetric(this.config.metric);

		this.querySelector('.value').textContent = formatValue(result.value);
		this.querySelector('.trend').textContent = formatTrend(result);
		this.querySelector('.chart-slot').innerHTML = renderChart(result);
	}
}

customElements.define('ldp-demo-card', LdpDemoCard);
