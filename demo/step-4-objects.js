// The LDP property (channel) of the Swell Lab site
const CHANNEL_ID = '845351493326064678';

// 0 = last 24 hours
const RANGE_KEY = 0;

// The Liferay Object that keeps each card's configuration
const OBJECT_URL = '/o/c/democardconfigs';

const METRICS = {
	sessionsMetric: 'Sessions',
	visitorsMetric: 'Unique visitors',
};

const STYLE = `
	<style>
		.ldp-demo-card {
			background: #fff;
			border-radius: 16px;
			box-shadow: 0 8px 24px rgba(11, 79, 108, 0.1);
			display: block;
			font-family: inherit;
			padding: 20px 24px;
		}

		.ldp-demo-card select {
			border: 1px solid #d5dbe0;
			border-radius: 8px;
			font: inherit;
			padding: 4px 8px;
		}

		.ldp-demo-card .value {
			color: #0b4f6c;
			font-size: 44px;
			font-weight: 700;
			margin: 12px 0 4px;
		}

		.ldp-demo-card .trend {
			color: #5b6b77;
			font-size: 14px;
		}
	</style>
`;

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
	const {data} = await api('/o/analytics-rest/v1.0/graphql', {
		body: JSON.stringify({
			query,
			variables: {channelId: CHANNEL_ID, rangeKey: RANGE_KEY},
		}),
		method: 'POST',
	});

	return data.site[metric];
}

// Each widget instance has its own portlet id, the same on the draft and the
// published page: it is the key of the card's entry in the Object
function getKey(element) {
	const wrapper = element.closest('[id^="p_p_id_"]');

	return wrapper.id.replace(/^p_p_id_/, '').replace(/_$/, '');
}

async function loadConfig(key) {
	try {
		const entry = await api(`${OBJECT_URL}/by-external-reference-code/${key}`);

		return {metric: entry.metric};
	}
	catch {

		// 404: this card was never configured

		return null;
	}
}

function saveConfig(key, config) {

	// PUT by external reference code creates the entry the first time and
	// replaces it afterwards

	return api(`${OBJECT_URL}/by-external-reference-code/${key}`, {
		body: JSON.stringify(config),
		method: 'PUT',
	});
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

	async connectedCallback() {
		this.classList.add('ldp-demo-card');

		this.key = getKey(this);
		this.config = (await loadConfig(this.key)) || this.config;

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

			saveConfig(this.key, this.config);

			this.render();
		});

		const result = await getMetric(this.config.metric);

		this.querySelector('.value').textContent = result.value.toLocaleString();
		this.querySelector('.trend').textContent = formatTrend(result);
	}
}

customElements.define('ldp-demo-card', LdpDemoCard);
