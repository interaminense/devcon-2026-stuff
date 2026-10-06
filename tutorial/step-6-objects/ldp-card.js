const METRICS = {
	sessionsMetric: 'Sessions',
	visitorsMetric: 'Visitors',
};

const RANGES = [7, 30, 90];

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

async function getChannelId() {
	const {items} = await api(
		'/o/analytics-settings-rest/v1.0/channels?pageSize=200'
	);

	const groupId = Number(Liferay.ThemeDisplay.getScopeGroupId());

	const channel = items.find((item) =>
		(item.dataSources || []).some((dataSource) =>
			(dataSource.siteIds || []).map(Number).includes(groupId)
		)
	);

	return channel.channelId;
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
			variables: {channelId: await getChannelId(), rangeKey},
		}),
		method: 'POST',
	});

	return data.site[metric];
}

const OBJECT_URL = '/o/c/ldpcards';

function getKey(element) {
	const wrapper = element.closest('[id^="p_p_id_"]');

	return wrapper.id.replace(/^p_p_id_/, '').replace(/_$/, '');
}

async function loadConfig(key) {
	try {
		const entry = await api(`${OBJECT_URL}/by-external-reference-code/${key}`);

		return {metric: entry.metric, rangeKey: entry.rangeKey};
	}
	catch {
		return null;
	}
}

function saveConfig(key, config) {
	return api(`${OBJECT_URL}/by-external-reference-code/${key}`, {
		body: JSON.stringify(config),
		method: 'PUT',
	});
}

function renderChart(points) {
	const max = Math.max(1, ...points.map(({value}) => value));
	const step = 300 / (points.length - 1);

	const line = points
		.map(({value}, index) => `${index * step},${78 - (value / max) * 74}`)
		.join(' ');

	return `
		<svg preserveAspectRatio="none" style="height: 80px; width: 100%;" viewBox="0 0 300 80">
			<polyline fill="none" points="${line}" stroke="#0b5fff" stroke-width="2" vector-effect="non-scaling-stroke" />
		</svg>
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

	async connectedCallback() {
		this.key = getKey(this);
		this.config = (await loadConfig(this.key)) || this.config;

		this.render();
	}

	async render() {
		const {metric, rangeKey} = this.config;

		this.innerHTML = `
			<div style="border: 1px solid #e7e7ed; border-radius: 8px; padding: 16px;">
				<select name="metric">${renderOptions(Object.entries(METRICS), metric)}</select>
				<select name="rangeKey">${renderOptions(RANGES.map((days) => [days, `Last ${days} days`]), rangeKey)}</select>
				<h3>${METRICS[metric]}</h3>
				<p data-role="value" style="font-size: 32px; font-weight: 600;">Loading...</p>
				<div data-role="chart"></div>
			</div>
		`;

		this.querySelectorAll('select').forEach((select) =>
			select.addEventListener('change', () => this.configure(select))
		);

		const result = await getMetric(metric, rangeKey);

		this.querySelector('[data-role="value"]').textContent = result.value;
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

		saveConfig(this.key, this.config);
	}
}

customElements.define('ldp-card', LdpCard);
