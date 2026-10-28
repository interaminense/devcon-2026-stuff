// The LDP property (channel) of the Swell Lab site
const CHANNEL_ID = '845351493326064678';

// 7 = last 7 days (LDP leaves today out)
const RANGE_KEY = 7;

async function getMetric(metric) {
	// page() without a page URL returns the totals of the whole site
	const query = `
		query ($channelId: String!, $rangeKey: Int) {
			page(channelId: $channelId, rangeKey: $rangeKey) {
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

	return data.page[metric];
}

class LdpDemoCard extends HTMLElement {
	async connectedCallback() {
		this.innerHTML = '<p>Loading...</p>';

		const result = await getMetric('visitorsMetric');

		this.innerHTML = `<p>Unique visitors: <strong>${result.value}</strong></p>`;
	}
}

customElements.define('ldp-demo-card', LdpDemoCard);
