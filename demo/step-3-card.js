// The LDP property (channel) of the Swell Lab site
const CHANNEL_ID = '845351493326064678';

// 0 = last 24 hours
const RANGE_KEY = 0;

const METRICS = {
	sessionsMetric: 'Sessions',
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
	</style>
`;

async function getMetric(metric) {
	const query = `
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

function formatTrend(result) {
	const percentage = result.trend?.percentage;

	if (percentage === null || percentage === undefined) {
		return `Previous period: ${result.previousValue}`;
	}

	const arrow = percentage > 0 ? '▲' : percentage < 0 ? '▼' : '';

	return `${arrow} ${Math.abs(percentage).toFixed(1)}% vs previous period (${result.previousValue})`;
}

class LdpDemoCard extends HTMLElement {
	config = {metric: 'visitorsMetric'};

	connectedCallback() {
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
			<div class="trend">Last 24 hours</div>
		`;

		this.querySelector('select').addEventListener('change', (event) => {
			this.config = {metric: event.target.value};

			this.render();
		});

		const result = await getMetric(this.config.metric);

		this.querySelector('.value').textContent = result.value.toLocaleString();
		this.querySelector('.trend').textContent = formatTrend(result);
	}
}

customElements.define('ldp-demo-card', LdpDemoCard);
