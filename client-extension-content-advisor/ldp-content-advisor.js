// Content Advisor: for signed-in users, outlines the content blocks of the
// page that get the fewest clicks, according to the surfContentClicked custom
// event in LDP, and asks an AI Hub agent how to improve each of them.

(() => {
	const AGENT_ERC = 'DEVCON_2026_LDP_CONTENT_ADVISOR';

	const CHANNEL_ID = '845351493326064678';

	const EVENT_NAME = 'surfContentClicked';

	const GRAPHQL_URL = '/o/analytics-rest/v1.0/graphql';

	// 0 is the last 24 hours

	const RANGE_KEY = 0;

	const RANGE_LABEL = 'last 24 hours';

	const AGENT_TIMEOUT = 60000;

	const STYLE = `
		.ldp-advisor-weak {
			outline: 3px solid var(--ldp-advisor-color);
			outline-offset: 6px;
			position: relative;
		}

		.ldp-advisor-badge {
			background: var(--ldp-advisor-color);
			border: 0;
			border-radius: 999px;
			box-shadow: 0 4px 12px rgba(29, 43, 54, 0.25);
			color: #fff;
			cursor: pointer;
			font: 600 12px/1 Inter, system-ui, sans-serif;
			left: 12px;
			padding: 8px 12px;
			position: absolute;
			top: 12px;
			z-index: 5;
		}

		.ldp-advisor-popover {
			background: #fff;
			border-radius: 14px;
			box-shadow: 0 16px 40px rgba(11, 79, 108, 0.25);
			box-sizing: border-box;
			color: #1d2b36;
			font: 14px/1.5 Inter, system-ui, sans-serif;
			padding: 16px 18px;
			position: absolute;
			z-index: 1001;
		}

		.ldp-advisor-popover h4 {
			color: #0b4f6c;
			font: 700 12px/1.2 Inter, system-ui, sans-serif;
			letter-spacing: 0.06em;
			margin: 0 0 8px;
			text-transform: uppercase;
		}

		.ldp-advisor-popover dl {
			margin: 0;
		}

		.ldp-advisor-popover dt {
			color: #5b6b77;
			font-size: 12px;
			font-weight: 600;
			margin-top: 8px;
		}

		.ldp-advisor-popover dd {
			margin: 2px 0 0;
		}

		.ldp-advisor-popover .ldp-advisor-close {
			background: none;
			border: 0;
			color: #5b6b77;
			cursor: pointer;
			font-size: 18px;
			position: absolute;
			right: 10px;
			top: 6px;
		}

		.ldp-advisor-toggle {
			background: #0b4f6c;
			border: 0;
			border-radius: 999px;
			bottom: 20px;
			box-shadow: 0 12px 32px rgba(11, 79, 108, 0.3);
			color: #fff;
			cursor: pointer;
			font: 600 14px/1 Inter, system-ui, sans-serif;
			left: 20px;
			padding: 12px 18px;
			position: fixed;
			z-index: 1000;
		}

		.ldp-advisor-toggle small {
			display: block;
			font-size: 11px;
			font-weight: 400;
			margin-top: 4px;
			opacity: 0.8;
		}
	`;

	const COLORS = ['#e2574f', '#e0932b'];

	async function request(url, options = {}) {
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

	async function query(text, variables) {
		const {data, errors} = await request(GRAPHQL_URL, {
			body: JSON.stringify({query: text, variables}),
			method: 'POST',
		});

		if (errors?.length) {
			throw new Error(errors[0].message);
		}

		return data;
	}

	function getPageURL() {
		const {origin, pathname} = window.location;

		return `${origin}${pathname.replace(/\/+$/, '')}`;
	}

	// Clicks per block come from the custom event, broken down by contentId;
	// page views give the rate. LDP creates the event definition on the first
	// click, so no definition just means no clicks yet.

	async function getClicks() {
		const {eventDefinitions} = await query(
			`query ($keyword: String) {
				eventDefinitions(eventType: CUSTOM, keyword: $keyword, page: 0, size: 10, sort: {column: "name", type: ASC}) {
					eventDefinitions {
						eventAttributeDefinitions {
							id
							name
						}
						id
						name
					}
				}
			}`,
			{keyword: EVENT_NAME}
		);

		const definition = eventDefinitions?.eventDefinitions?.find(
			({name}) => name === EVENT_NAME
		);

		const attribute = definition?.eventAttributeDefinitions?.find(
			({name}) => name === 'contentId'
		);

		if (!attribute) {
			return new Map();
		}

		const {eventAnalysisResult} = await query(
			`query ($attributeId: String!, $channelId: String!, $eventDefinitionId: String!, $rangeKey: Int) {
				eventAnalysisResult(analysisType: TOTAL, channelId: $channelId, compareToPrevious: false, eventAnalysisBreakdowns: [{attributeId: $attributeId, attributeType: EVENT, dataType: STRING, displayName: "contentId", sortType: DESC}], eventDefinitionId: $eventDefinitionId, page: 0, rangeKey: $rangeKey, size: 50) {
					breakdownItems {
						name
						value
					}
				}
			}`,
			{
				attributeId: attribute.id,
				channelId: CHANNEL_ID,
				eventDefinitionId: definition.id,
				rangeKey: RANGE_KEY,
			}
		);

		return new Map(
			(eventAnalysisResult?.breakdownItems || []).map(({name, value}) => [
				name,
				value || 0,
			])
		);
	}

	async function getPageViews() {
		const {page} = await query(
			`query ($channelId: String, $rangeKey: Int, $url: String) {
				page(canonicalUrl: $url, channelId: $channelId, rangeKey: $rangeKey) {
					viewsMetric {
						value
					}
				}
			}`,
			{channelId: CHANNEL_ID, rangeKey: RANGE_KEY, url: getPageURL()}
		);

		return page?.viewsMetric?.value || 0;
	}

	function readBlocks() {
		return [...document.querySelectorAll('[data-content-id]')].map(
			(element, index) => ({
				element,
				id: element.dataset.contentId,
				position: index + 1,
				text:
					element.querySelector('[data-content-text]')?.textContent.trim() ||
					'',
				title:
					element.querySelector('[data-content-title]')?.textContent.trim() ||
					'',
			})
		);
	}

	function percent(value) {
		return `${Math.round(value * 1000) / 10}%`;
	}

	// The agent gets plain text: the firewall in front of AI Hub rejects a
	// context that carries nested JSON

	function describe(block, label) {
		return [
			label,
			`position: ${block.position} of ${block.total}`,
			`title: ${block.title}`,
			`text: ${block.text}`,
			`clicks: ${block.clicks}`,
			`click rate: ${percent(block.rate)}`,
		].join('\n');
	}

	function buildContext(weak, best, analysis) {
		return [
			`page: ${document.title.split(' - ')[0]}`,
			`period: ${RANGE_LABEL}`,
			`page views: ${analysis.views}`,
			`average click rate: ${percent(analysis.average)}`,
			'',
			describe(weak, 'CONTENT TO IMPROVE'),
			'',
			describe(best, 'BEST CONTENT, FOR COMPARISON'),
		].join('\n');
	}

	async function askAgent(contents) {
		const token = await request('/o/ai-hub-cell/v1.0/authorization-tokens', {
			method: 'POST',
		});

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT);

		try {
			const response = await fetch(
				`${token.serviceURL}/o/ai-hub/v1.0/agent-instances/subscribe`,
				{
					headers: {
						Accept: 'text/event-stream',
						Authorization: `Bearer ${token.accessToken}`,
					},
					signal: controller.signal,
				}
			);

			if (!response.ok) {
				throw new Error(`AI Hub returned ${response.status}`);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			let buffer = '';

			while (true) {
				const {done, value} = await reader.read();

				if (done) {
					throw new Error('AI Hub closed the stream without an answer.');
				}

				buffer += decoder.decode(value, {stream: true});

				let end;

				while ((end = buffer.indexOf('\n\n')) >= 0) {
					const block = buffer.slice(0, end);

					buffer = buffer.slice(end + 2);

					const name = block.match(/^event: ?(.*)$/m)?.[1];
					const data = block
						.split('\n')
						.filter((line) => line.startsWith('data:'))
						.map((line) => line.slice(5).trim())
						.join('\n');

					if (name === 'Subscribe') {
						const started = await fetch(
							`${token.serviceURL}/o/ai-hub/v1.0/agent-instances`,
							{
								body: JSON.stringify({
									agentDefinitionExternalReferenceCode: AGENT_ERC,
									context: {contents},
									sseEventSinkKey: data,
								}),
								headers: {
									'Accept': 'application/json',
									'Authorization': `Bearer ${token.accessToken}`,
									'Content-Type': 'application/json',
									'Liferay-AI-Hub-Cell-On-Behalf-Of': token.userToken,
								},
								method: 'POST',
							}
						);

						if (started.status === 404) {
							throw new Error(
								`The ${AGENT_ERC} agent does not exist in AI Hub yet.`
							);
						}

						if (!started.ok) {
							throw new Error(`AI Hub returned ${started.status}`);
						}
					}
					else if (name === AGENT_ERC) {
						return JSON.parse(data).data;
					}
					else if (name === 'Agent Invocation Failed') {
						throw new Error('The AI Hub agent could not answer.');
					}
				}
			}
		}
		catch (error) {
			if (error.name === 'AbortError') {
				throw new Error('AI Hub took too long to answer.');
			}

			if (error instanceof TypeError) {
				throw new Error(
					'AI Hub refused the request (check the agent and the Environment URL).'
				);
			}

			throw error;
		}
		finally {
			clearTimeout(timer);

			controller.abort();
		}
	}

	// The agent answers in labeled lines; anything else is shown as is

	function parseSuggestion(text) {
		const fields = {};

		for (const line of text.split('\n')) {
			const match = line.match(
				/^\s*(Problem|Suggestion|New title|New text)\s*:\s*(.+)$/i
			);

			if (match) {
				fields[match[1].toLowerCase()] = match[2].trim();
			}
		}

		return Object.keys(fields).length ? fields : {suggestion: text};
	}

	function escape(text) {
		return String(text ?? '').replace(
			/[&<>"']/g,
			(character) =>
				({
					'"': '&quot;',
					'&': '&amp;',
					"'": '&#39;',
					'<': '&lt;',
					'>': '&gt;',
				})[character]
		);
	}

	class ContentAdvisor {
		constructor() {
			this.enabled = true;
			this.suggestions = new Map();
		}

		async run() {
			this.blocks = readBlocks();

			if (!this.blocks.length) {
				return;
			}

			this.renderToggle('Analyzing content...');

			try {
				const [clicks, views] = await Promise.all([
					getClicks(),
					getPageViews(),
				]);

				for (const block of this.blocks) {
					block.clicks = clicks.get(block.id) || 0;
					block.rate = views ? block.clicks / views : 0;
					block.total = this.blocks.length;
				}

				const average =
					this.blocks.reduce((sum, block) => sum + block.rate, 0) /
					this.blocks.length;

				this.analysis = {average, views};

				const totalClicks = this.blocks.reduce(
					(sum, block) => sum + block.clicks,
					0
				);

				if (!totalClicks) {
					this.weak = [];

					this.renderToggle(`No clicks yet · ${RANGE_LABEL}`);

					return;
				}

				const ranked = [...this.blocks].sort((a, b) => a.rate - b.rate);

				this.best = ranked[ranked.length - 1];

				this.weak = ranked
					.filter((block) => block.rate < average)
					.slice(0, COLORS.length);

				this.renderToggle(
					`${this.weak.length} to improve · ${views} views · ${RANGE_LABEL}`
				);

				this.renderOutlines();
			}
			catch (error) {
				console.error(error);

				this.renderToggle(`Could not reach LDP: ${error.message}`);
			}
		}

		renderToggle(detail) {
			if (!this.toggle) {
				this.toggle = document.createElement('button');
				this.toggle.className = 'ldp-advisor-toggle';
				this.toggle.type = 'button';

				this.toggle.addEventListener('click', () => {
					this.enabled = !this.enabled;

					this.renderToggle(this.detail);
					this.renderOutlines();
				});

				document.body.appendChild(this.toggle);
			}

			this.detail = detail;

			this.toggle.innerHTML = `✦ Content advisor: ${this.enabled ? 'on' : 'off'}<small>${escape(detail)}</small>`;
		}

		clear() {
			for (const element of document.querySelectorAll(
				'.ldp-advisor-badge, .ldp-advisor-popover'
			)) {
				element.remove();
			}

			for (const element of document.querySelectorAll('.ldp-advisor-weak')) {
				element.classList.remove('ldp-advisor-weak');
				element.style.removeProperty('--ldp-advisor-color');
			}
		}

		renderOutlines() {
			this.clear();

			if (!this.enabled) {
				return;
			}

			(this.weak || []).forEach((block, index) => {
				block.element.classList.add('ldp-advisor-weak');
				block.element.style.setProperty('--ldp-advisor-color', COLORS[index]);

				const badge = document.createElement('button');

				badge.className = 'ldp-advisor-badge';
				badge.type = 'button';
				badge.textContent = `✦ ${block.clicks} ${block.clicks === 1 ? 'click' : 'clicks'} · ${percent(block.rate)} · position ${block.position}`;

				badge.addEventListener('click', (event) => {
					event.preventDefault();
					event.stopPropagation();

					this.openSuggestion(block);
				});

				block.element.appendChild(badge);
			});
		}

		async openSuggestion(block) {
			for (const element of document.querySelectorAll('.ldp-advisor-popover')) {
				element.remove();
			}

			// The cards clip their content to round the photo, so the popover
			// lives in the body, lined up with the card

			const popover = document.createElement('div');
			const rect = block.element.getBoundingClientRect();

			popover.style.left = `${rect.left + window.scrollX + 12}px`;
			popover.style.top = `${rect.top + window.scrollY + 52}px`;
			popover.style.width = `${Math.max(rect.width - 24, 280)}px`;

			popover.className = 'ldp-advisor-popover';

			popover.addEventListener('click', (event) => {
				event.stopPropagation();

				if (event.target.closest('.ldp-advisor-close')) {
					popover.remove();
				}
			});

			document.body.appendChild(popover);

			const contents = buildContext(block, this.best, this.analysis);

			const render = (body) => {
				popover.innerHTML = `
					<button aria-label="Close" class="ldp-advisor-close" type="button">&times;</button>
					<h4>✦ AI suggestion · ${escape(block.title)}</h4>
					${body}
				`;
			};

			const cached = this.suggestions.get(contents);

			if (cached) {
				render(cached);

				return;
			}

			render('<p>Asking AI Hub...</p>');

			try {
				const fields = parseSuggestion(await askAgent(contents));

				const body = `
					<dl>
						${fields.problem ? `<dt>Problem</dt><dd>${escape(fields.problem)}</dd>` : ''}
						${fields.suggestion ? `<dt>Suggestion</dt><dd>${escape(fields.suggestion)}</dd>` : ''}
						${fields['new title'] ? `<dt>New title</dt><dd>${escape(fields['new title'])}</dd>` : ''}
						${fields['new text'] ? `<dt>New text</dt><dd>${escape(fields['new text'])}</dd>` : ''}
					</dl>
				`;

				this.suggestions.set(contents, body);

				render(body);
			}
			catch (error) {
				render(`<p>${escape(error.message)}</p>`);
			}
		}

		dispose() {
			this.clear();

			this.toggle?.remove();
			this.toggle = null;
		}
	}

	let advisor;

	function start() {
		if (!window.Liferay?.ThemeDisplay?.isSignedIn()) {
			return;
		}

		advisor?.dispose();
		advisor = null;

		if (!document.querySelector('[data-content-id]')) {
			return;
		}

		if (!document.getElementById('ldp-advisor-style')) {
			const style = document.createElement('style');

			style.id = 'ldp-advisor-style';
			style.textContent = STYLE;

			document.head.appendChild(style);
		}

		advisor = new ContentAdvisor();

		advisor.run();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start);
	}
	else {
		start();
	}

	window.Liferay?.on?.('endNavigate', start);
})();
