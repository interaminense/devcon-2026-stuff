// The LDP property (channel) to read. See step 4 of the tutorial for how to
// find it.

const CHANNEL_ID = '<your channelId>';

const METRICS = {
	sessionsMetric: 'Sessions',
	visitorsMetric: 'Visitors',
};

const RANGES = [7, 30, 90];

const STYLE = `
	<style>
		ldp-card {
			display: block;
			font-family: inherit;
		}

		ldp-card .card {
			background: #fff;
			border: 1px solid #e7e7ed;
			border-radius: 12px;
			box-shadow: 0 1px 3px rgba(39, 40, 51, 0.08);
			padding: 20px 24px;
		}

		ldp-card .header {
			align-items: center;
			display: flex;
			gap: 12px;
			justify-content: space-between;
		}

		ldp-card .eyebrow {
			color: #6b6c7e;
			font-size: 12px;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}

		ldp-card .title {
			color: #272833;
			font-size: 18px;
			font-weight: 600;
			margin: 2px 0 0;
		}

		ldp-card .filters {
			display: flex;
			gap: 8px;
		}

		ldp-card select {
			appearance: none;
			background: #f1f2f5 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b6c7e'/%3E%3C/svg%3E") no-repeat right 10px center;
			border: 1px solid transparent;
			border-radius: 6px;
			color: #272833;
			cursor: pointer;
			font: inherit;
			font-size: 13px;
			padding: 6px 28px 6px 10px;
		}

		ldp-card select:hover,
		ldp-card select:focus {
			border-color: #0b5fff;
			outline: none;
		}

		ldp-card .value {
			color: #272833;
			font-size: 40px;
			font-weight: 700;
			line-height: 1;
			margin: 20px 0 12px;
		}

		ldp-card .chart {
			display: block;
			height: 96px;
			width: 100%;
		}

		ldp-card .axis {
			color: #6b6c7e;
			display: flex;
			font-size: 12px;
			justify-content: space-between;
			margin-top: 6px;
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

async function getMetric(metric, rangeKey) {
	const query = `
		query ($channelId: String!, $rangeKey: Int) {
			site(channelId: $channelId, interval: "D", rangeKey: $rangeKey) {
				${metric} {
					value
					histogram {
						metrics {
							key
							value
						}
					}
				}
			}
		}
	`;

	const {data} = await api('/o/analytics-rest/v1.0/graphql', {
		body: JSON.stringify({
			query,
			variables: {channelId: CHANNEL_ID, rangeKey},
		}),
		method: 'POST',
	});

	return data.site[metric];
}

function renderChart(points) {
	const max = Math.max(1, ...points.map(({value}) => value));
	const step = 300 / (points.length - 1);

	const line = points
		.map(({value}, index) => `${index * step},${94 - (value / max) * 88}`)
		.join(' ');

	return `
		<svg class="chart" preserveAspectRatio="none" viewBox="0 0 300 96">
			<polygon fill="rgba(11, 95, 255, 0.12)" points="0,96 ${line} 300,96" />
			<polyline fill="none" points="${line}" stroke="#0b5fff" stroke-width="2" vector-effect="non-scaling-stroke" />
		</svg>
		<div class="axis">
			<span>${points[0].key.slice(0, 10)}</span>
			<span>${points.at(-1).key.slice(0, 10)}</span>
		</div>
	`;
}

function renderOptions(options, selected) {
	return options
		.map(
			([value, label]) =>
				`<option ${value === selected ? 'selected' : ''} value="${value}">${label}</option>`
		)
		.join('');
}

class LdpCard extends HTMLElement {
	config = {metric: 'visitorsMetric', rangeKey: 30};

	connectedCallback() {
		this.render();
	}

	async render() {
		const {metric, rangeKey} = this.config;

		this.innerHTML = `
			${STYLE}
			<div class="card">
				<div class="header">
					<div>
						<div class="eyebrow">Liferay Data Platform</div>
						<h3 class="title">${METRICS[metric]}</h3>
					</div>
					<div class="filters">
						<select name="metric">${renderOptions(Object.entries(METRICS), metric)}</select>
						<select name="rangeKey">${renderOptions(RANGES.map((days) => [days, `Last ${days} days`]), rangeKey)}</select>
					</div>
				</div>
				<div class="value" data-role="value">Loading...</div>
				<div data-role="chart"></div>
			</div>
		`;

		this.querySelectorAll('select').forEach((select) =>
			select.addEventListener('change', () => this.configure(select))
		);

		const result = await getMetric(metric, rangeKey);

		this.querySelector('[data-role="value"]').textContent =
			result.value.toLocaleString();
		this.querySelector('[data-role="chart"]').innerHTML = renderChart(
			result.histogram.metrics
		);
	}

	configure(select) {
		this.config = {
			...this.config,
			[select.name]:
				select.name === 'rangeKey' ? Number(select.value) : select.value,
		};

		this.render();
	}
}

customElements.define('ldp-card', LdpCard);
