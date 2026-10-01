const QUERY = `
	query SitesMetricQuery(
		$channelId: String!
		$interval: String!
		$rangeEnd: String
		$rangeKey: Int
		$rangeStart: String
	) {
		site(
			channelId: $channelId
			interval: $interval
			rangeEnd: $rangeEnd
			rangeKey: $rangeKey
			rangeStart: $rangeStart
		) {
			sessionsMetric {
				histogram {
					metrics {
						key
						value
					}
				}
			}
			visitorsMetric {
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

const METRICS = {
	sessionsMetric: 'Sessions',
	visitorsMetric: 'Visitors',
};

const TEMPLATE = `
	<style>
		:host {
			display: block;
			font-family: inherit;
		}

		.card {
			background: #fff;
			border: 1px solid #e7e7ed;
			border-radius: 8px;
			padding: 20px;
		}

		.header {
			align-items: center;
			display: flex;
			flex-wrap: wrap;
			gap: 12px;
			justify-content: space-between;
		}

		.eyebrow {
			color: #6b6c7e;
			font-size: 12px;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}

		.title {
			color: #272833;
			font-size: 20px;
			font-weight: 600;
		}

		.filters {
			align-items: center;
			display: flex;
			flex-wrap: wrap;
			font-size: 14px;
			gap: 8px;
		}

		.custom {
			align-items: center;
			display: none;
			gap: 6px;
		}

		.kpis {
			display: flex;
			gap: 32px;
			margin: 16px 0;
		}

		.kpi-label,
		.axis,
		.status {
			color: #6b6c7e;
			font-size: 12px;
		}

		.kpi-value {
			color: #272833;
			font-size: 28px;
			font-weight: 600;
		}

		svg {
			display: block;
			height: 200px;
			width: 100%;
		}

		.axis {
			display: flex;
			justify-content: space-between;
			margin-top: 4px;
		}

		.status {
			margin-top: 12px;
		}
	</style>

	<div class="card">
		<div class="header">
			<div>
				<div class="eyebrow">LDP · client extension</div>
				<div class="title" data-role="title"></div>
			</div>

			<div class="filters">
				<select data-role="metric">
					<option value="visitorsMetric">Visitors</option>
					<option value="sessionsMetric">Sessions</option>
				</select>

				<select data-role="range">
					<option value="7">Last 7 days</option>
					<option value="30">Last 30 days</option>
					<option value="90">Last 90 days</option>
					<option value="365">Last 365 days</option>
					<option value="custom">Custom range</option>
				</select>

				<span class="custom" data-role="custom">
					<input data-role="start" type="date" />
					<span>→</span>
					<input data-role="end" type="date" />
				</span>
			</div>
		</div>

		<div class="kpis">
			<div>
				<div class="kpi-label">Sum of daily values</div>
				<div class="kpi-value" data-role="total">-</div>
			</div>

			<div>
				<div class="kpi-label">Peak day</div>
				<div class="kpi-value" data-role="peak">-</div>
			</div>
		</div>

		<svg data-role="chart" preserveAspectRatio="none" viewBox="0 0 700 200"></svg>

		<div class="axis" data-role="axis"></div>
		<div class="status" data-role="status"></div>
	</div>
`;

let channelIdPromise;

function request(url, options = {}) {
	return fetch(url, {
		...options,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'x-csrf-token': Liferay.authToken,
			...options.headers,
		},
	}).then((response) => {
		if (!response.ok) {
			throw new Error(`${url} returned ${response.status}`);
		}

		return response.json();
	});
}

function getChannelId() {
	if (!channelIdPromise) {
		channelIdPromise = request(
			'/o/analytics-settings-rest/v1.0/channels?pageSize=200'
		).then((page) => {
			const groupId = Number(Liferay.ThemeDisplay.getScopeGroupId());

			const channel = (page.items || []).find((item) =>
				(item.dataSources || []).some((dataSource) =>
					(dataSource.siteIds || []).map(Number).includes(groupId)
				)
			);

			if (!channel) {
				throw new Error('No LDP channel is connected to this site');
			}

			return channel.channelId;
		});
	}

	return channelIdPromise;
}

class LdpVisitors extends HTMLElement {
	connectedCallback() {
		if (this.shadowRoot) {
			return;
		}

		this.attachShadow({mode: 'open'}).innerHTML = TEMPLATE;

		this._get('metric').value = this.getAttribute('metric') || 'visitorsMetric';
		this._get('range').value = this.getAttribute('range') || '30';

		['end', 'metric', 'range', 'start'].forEach((role) =>
			this._get(role).addEventListener('change', () => this._load())
		);

		this._load();
	}

	_get(role) {
		return this.shadowRoot.querySelector(`[data-role="${role}"]`);
	}

	_getVariables(channelId) {
		const range = this._get('range').value;

		if (range !== 'custom') {
			return {channelId, interval: 'D', rangeKey: Number(range)};
		}

		return {
			channelId,
			interval: 'D',
			rangeEnd: this._get('end').value,
			rangeStart: this._get('start').value,
		};
	}

	async _load() {
		const metric = this._get('metric').value;
		const custom = this._get('range').value === 'custom';

		this._get('title').textContent = METRICS[metric];
		this._get('custom').style.display = custom ? 'inline-flex' : 'none';

		if (custom && !(this._get('start').value && this._get('end').value)) {
			this._get('status').textContent = 'Pick a start and an end date.';

			return;
		}

		this._get('status').textContent = 'Loading...';

		const startedAt = performance.now();

		try {
			const variables = this._getVariables(await getChannelId());

			const json = await request('/o/analytics-rest/v1.0/graphql', {
				body: JSON.stringify({query: QUERY, variables}),
				method: 'POST',
			});

			if (json.errors) {
				throw new Error(json.errors[0].message);
			}

			this._render(json.data.site[metric].histogram.metrics);

			this._get('status').textContent = `POST /o/analytics-rest/v1.0/graphql · ${JSON.stringify(variables)} · ${Math.round(performance.now() - startedAt)} ms`;
		}
		catch (error) {
			this._get('status').textContent = `Error: ${error.message}`;
		}
	}

	_render(metrics) {
		const height = 200;
		const width = 700;

		const max = Math.max(1, ...metrics.map(({value}) => value));
		const step = metrics.length > 1 ? width / (metrics.length - 1) : 0;

		const line = metrics
			.map(
				({value}, index) =>
					`${index * step},${height - 10 - (value / max) * (height - 20)}`
			)
			.join(' ');

		this._get('chart').innerHTML = `
			<polygon fill="rgba(11, 95, 255, 0.12)" points="0,${height} ${line} ${width},${height}"></polygon>
			<polyline fill="none" points="${line}" stroke="#0b5fff" stroke-width="2" vector-effect="non-scaling-stroke"></polyline>
		`;

		const total = metrics.reduce((sum, {value}) => sum + value, 0);

		const peak = metrics.reduce(
			(best, metric) => (metric.value > best.value ? metric : best),
			{value: 0}
		);

		this._get('total').textContent = total.toLocaleString();
		this._get('peak').textContent = peak.key
			? `${peak.value} on ${peak.key.slice(0, 10)}`
			: '-';

		const first = metrics.length ? metrics[0].key.slice(0, 10) : '';
		const last = metrics.length ? metrics.at(-1).key.slice(0, 10) : '';

		this._get('axis').innerHTML = `<span>${first}</span><span>${last}</span>`;
	}
}

if (!customElements.get('ldp-visitors')) {
	customElements.define('ldp-visitors', LdpVisitors);
}
