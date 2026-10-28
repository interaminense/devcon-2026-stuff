// Content Advisor: for signed-in users, outlines the content blocks of the
// page that get the fewest clicks, according to the surfContentClicked custom
// event in LDP, and asks an AI Hub agent how to improve each of them.

(() => {
	// The Swell Lab CMS space, where accepted blog suggestions become drafts

	const SPACE_GROUP_ID = 40943;

	const CHANNEL_ID = '845351493326064678';


	const GRAPHQL_URL = '/o/analytics-rest/v1.0/graphql';

	// 7 is the last 7 days (LDP leaves today out)

	const RANGE_KEY = 7;

	const RANGE_LABEL = 'last 7 days';

	const AGENT_TIMEOUT = 60000;

	const STYLE = `
		.ldp-advisor-best,
		.ldp-advisor-weak {
			outline: 3px solid var(--ldp-advisor-color);
			outline-offset: 6px;
			position: relative;
		}

		.ldp-advisor-best {
			--ldp-advisor-color: #1f9d6b;
		}

		.ldp-advisor-weak {
			--ldp-advisor-color: #e2574f;
		}

		.ldp-advisor-badge {
			align-items: flex-start;
			display: flex;
			flex-direction: column;
			gap: 8px;
			left: 12px;
			position: absolute;
			top: 12px;
			z-index: 5;
		}

		.ldp-advisor-label {
			background: rgba(11, 79, 108, 0.88);
			border-radius: 999px;
			box-shadow: 0 4px 12px rgba(29, 43, 54, 0.25);
			box-sizing: border-box;
			color: #fff;
			font: 600 12px/1 Inter, system-ui, sans-serif;
			padding: 9px 12px;
		}

		.ldp-advisor-best .ldp-advisor-label,
		.ldp-advisor-weak .ldp-advisor-label {
			background: var(--ldp-advisor-color);
		}

		.ldp-advisor-ai {
			align-items: center;
			background: #fff;
			border: 2px solid var(--ldp-advisor-color);
			border-radius: 999px;
			box-shadow: 0 6px 16px rgba(29, 43, 54, 0.25);
			color: var(--ldp-advisor-color);
			cursor: pointer;
			display: inline-flex;
			font: 700 13px/1 Inter, system-ui, sans-serif;
			gap: 8px;
			padding: 9px 14px 9px 12px;
			transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
		}

		.ldp-advisor-ai:hover,
		.ldp-advisor-ai:focus-visible {
			background: var(--ldp-advisor-color);
			color: #fff;
			outline: none;
			transform: translateY(-1px);
		}

		.ldp-advisor-ai svg {
			height: 16px;
			width: 16px;
		}

		.ldp-advisor-backdrop {
			align-items: center;
			background: rgba(13, 31, 43, 0.55);
			display: flex;
			inset: 0;
			justify-content: center;
			padding: 24px;
			position: fixed;
			z-index: 1001;
		}

		.ldp-advisor-modal {
			background: #fff;
			border-radius: 20px;
			box-shadow: 0 24px 64px rgba(11, 79, 108, 0.35);
			box-sizing: border-box;
			color: #1d2b36;
			font: 16px/1.6 Inter, system-ui, sans-serif;
			max-height: calc(100vh - 48px);
			max-width: 620px;
			overflow: auto;
			padding: 32px 36px;
			position: relative;
			width: 100%;
		}

		.ldp-advisor-modal__eyebrow {
			align-items: center;
			color: #e2574f;
			display: flex;
			font: 700 12px/1 Inter, system-ui, sans-serif;
			gap: 8px;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}

		.ldp-advisor-modal__eyebrow svg {
			height: 16px;
			width: 16px;
		}

		.ldp-advisor-modal h3 {
			color: #0b4f6c;
			font: 700 24px/1.25 Poppins, Inter, sans-serif;
			margin: 10px 0 6px;
			padding-right: 32px;
		}

		.ldp-advisor-modal__meta {
			color: #5b6b77;
			font-size: 14px;
			margin: 0 0 24px;
		}

		.ldp-advisor-modal__section {
			border-top: 1px solid rgba(11, 79, 108, 0.12);
			display: grid;
			gap: 12px;
			padding: 22px 0;
		}

		.ldp-advisor-modal__section:last-child {
			padding-bottom: 0;
		}

		.ldp-advisor-modal__label {
			color: #5b6b77;
			font: 700 12px/1 Inter, system-ui, sans-serif;
			letter-spacing: 0.06em;
			text-transform: uppercase;
		}

		.ldp-advisor-modal__section p {
			margin: 0;
		}

		.ldp-advisor-modal__new {
			background: #f7f3ea;
			border-radius: 12px;
			display: grid;
			gap: 8px;
			padding: 18px 20px;
		}

		.ldp-advisor-modal__new strong {
			color: #0b4f6c;
			display: block;
			font: 700 18px/1.35 Poppins, Inter, sans-serif;
		}

		.ldp-advisor-modal__problem {
			background: #fdecea;
			border-radius: 999px;
			color: #b8352d;
			font: 700 12px/1 Inter, system-ui, sans-serif;
			justify-self: start;
			letter-spacing: 0.04em;
			padding: 6px 12px;
			text-transform: uppercase;
		}

		.ldp-advisor-modal__loading {
			color: #5b6b77;
			margin: 8px 0 0;
		}

		.ldp-advisor-close {
			background: #f1f4f6;
			border: 0;
			border-radius: 50%;
			color: #1d2b36;
			cursor: pointer;
			font-size: 22px;
			height: 36px;
			line-height: 1;
			position: absolute;
			right: 18px;
			top: 18px;
			width: 36px;
		}

		.ldp-advisor-close:hover,
		.ldp-advisor-close:focus-visible {
			background: #e2e8ec;
			outline: none;
		}

		.ldp-advisor-badge--inline .ldp-advisor-ai,
		.ldp-advisor-badge--inline .ldp-advisor-label {
			box-shadow: none;
		}

		.ldp-advisor-badge--inline {
			align-items: center;
			flex-direction: row;
			flex-wrap: nowrap;
			margin-bottom: 4px;
			white-space: nowrap;
			position: static;
		}

		.sl-blog-card.ldp-advisor-best,
		.sl-blog-card.ldp-advisor-weak {
			outline-offset: 4px;
		}

		.ldp-advisor-modal__new em {
			color: #5b6b77;
			font-style: normal;
		}

		.ldp-advisor-modal__actions {
			align-items: center;
			border-top: 1px solid rgba(11, 79, 108, 0.12);
			display: flex;
			flex-wrap: wrap;
			gap: 12px 16px;
			padding-top: 22px;
		}

		.ldp-advisor-accept {
			background: #0b4f6c;
			border: 0;
			border-radius: 999px;
			color: #fff;
			cursor: pointer;
			font: 700 15px/1 Inter, system-ui, sans-serif;
			padding: 13px 20px;
			text-decoration: none;
		}

		.ldp-advisor-accept:hover,
		.ldp-advisor-accept:focus-visible {
			background: #083b51;
			color: #fff;
			outline: none;
		}

		.ldp-advisor-accept:disabled {
			cursor: default;
			opacity: 0.6;
		}

		.ldp-advisor-modal__hint {
			color: #5b6b77;
			flex: 1 1 220px;
			font-size: 13px;
			line-height: 1.45;
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

	// Sparkles, the usual AI mark

	const AI_ICON =
		'<svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><path d="M10 2.5l1.6 4.9a4 4 0 0 0 2.5 2.5L19 11.5l-4.9 1.6a4 4 0 0 0-2.5 2.5L10 20.5l-1.6-4.9a4 4 0 0 0-2.5-2.5L1 11.5l4.9-1.6a4 4 0 0 0 2.5-2.5z"/><path d="M19 1l.7 2.1a1.5 1.5 0 0 0 1 1L23 4.8l-2.1.7a1.5 1.5 0 0 0-1 1L19 8.6l-.7-2.1a1.5 1.5 0 0 0-1-1L15 4.8l2.1-.7a1.5 1.5 0 0 0 1-1z"/></svg>';

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
			{keyword: target.event}
		);

		const definition = eventDefinitions?.eventDefinitions?.find(
			({name}) => name === target.event
		);

		const attribute = definition?.eventAttributeDefinitions?.find(
			({name}) => name === target.attribute
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

		// LDP returns attribute values in lower case

		return new Map(
			(eventAnalysisResult?.breakdownItems || []).map(({name, value}) => [
				name.toLowerCase(),
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

	function readBlogPosts() {
		const cards = [...document.querySelectorAll('.sl-blog-card')];

		return cards.map((element, index) => {
			const mapped = element.querySelector(
				'[data-analytics-external-reference-code]'
			);

			return {
				assetId: mapped?.dataset.analyticsAssetId,
				element,
				id: (mapped?.dataset.analyticsExternalReferenceCode || '').toLowerCase(),
				position: index + 1,
				text:
					element.querySelector('.sl-card__text')?.textContent.trim() || '',
				title:
					element.querySelector('.sl-card__title')?.textContent.trim() || '',
			};
		});
	}

	function readLearnBlocks() {
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

	// The firewall also reads "17 and 22" or "3 or 4" as SQL injection

	function firewallSafe(text) {
		return text
			.replace(/(\d)\s+and\s+(\d)/gi, '$1 & $2')
			.replace(/(\d)\s+or\s+(\d)/gi, '$1 / $2');
	}

	function describe(block, label) {
		return [
			label,
			`position: ${block.position} of ${block.total}`,
			`title: ${block.title}`,
			`text: ${block.text}`,
			...(block.excerpt ? [`post excerpt: ${block.excerpt}`] : []),
			`clicks: ${block.clicks}`,
			`share of all clicks on the page: ${percent(block.share)}`,
			`click rate (clicks per page view): ${percent(block.rate)}`,
		].join('\n');
	}

	function buildContext(weak, best, analysis) {
		return [
			`page: ${document.title.split(' - ')[0]}`,
			`period: ${RANGE_LABEL}`,
			`page views: ${analysis.views}`,
			`total clicks on the page: ${analysis.totalClicks}`,
			`average share per content: ${percent(analysis.average)}`,
			'',
			describe(weak, 'CONTENT TO IMPROVE'),
			'',
			describe(best, 'BEST CONTENT, FOR COMPARISON'),
		]
			.map(firewallSafe)
			.join('\n');
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
									agentDefinitionExternalReferenceCode: target.agent,
									context: {[target.contextKey]: contents},
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
								`The ${target.agent} agent does not exist in AI Hub yet.`
							);
						}

						if (!started.ok) {
							throw new Error(`AI Hub returned ${started.status}`);
						}
					}
					else if (name === target.agent) {
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

	// The firewall in front of AI Hub sometimes rejects a call made right
	// after others; one retry after a short pause usually goes through

	async function askAgentWithRetry(contents) {
		try {
			return await askAgent(contents);
		}
		catch (error) {
			if (!/refused/.test(error.message)) {
				throw error;
			}

			await new Promise((resolve) => setTimeout(resolve, 4000));

			return askAgent(contents);
		}
	}

	// The agent answers in labeled lines; anything else is shown as is

	// The post body, read from the CMS: a short excerpt goes to the agent and
	// the full body is kept for the draft

	async function loadPost(block) {
		if (!block?.assetId || block.contentHtml !== undefined) {
			return;
		}

		const post = await loadPublishedPost(block.assetId);

		block.postId = post.id;
		block.contentHtml = post.content || '';
		block.languageId = post.defaultLanguageId || 'en_US';
		block.excerpt = (post.contentRawText || '').replace(/\s+/g, ' ').trim().slice(0, 600);
	}

	// Once a post has a draft version, the site renders a snapshot of the
	// published version with its own id, which the CMS API does not know. The
	// snapshot points to the post (its head), and the post lists its versions.

	async function loadPublishedPost(id) {
		const entry = await request(
			`/api/jsonws/object.objectentry/get-object-entry?objectEntryId=${id}&p_auth=${Liferay.authToken}`
		);

		if (String(entry.headObjectEntryId) === String(id)) {
			return request(`/o/cms/blogs/${id}`);
		}

		const head = await request(`/o/cms/blogs/${entry.headObjectEntryId}`);

		const versions = await request(
			`/o/cms/blogs/scopes/${SPACE_GROUP_ID}/by-external-reference-code/${encodeURIComponent(head.externalReferenceCode)}/versions`
		);

		const published = versions.items.filter(
			(version) => version.status?.code === 0
		);

		return published[published.length - 1] || head;
	}

	// Accepting saves the rewrite as a draft version of the same post: the
	// new intro goes on top of the original body, and the editor reviews and
	// publishes it in the CMS. The localized fields win over the plain ones,
	// so both are sent.

	function saveDraft(block, fields) {
		const localized = (value) => ({[block.languageId]: value});

		const content = `${fields['new text'] ? `<p>${escape(fields['new text'])}</p>` : ''}${block.contentHtml || ''}`;
		const subtitle = fields['new subtitle'] || block.text;
		const title = fields['new title'];

		return request(`/o/cms/blogs/${block.postId}`, {
			body: JSON.stringify({
				content,
				content_i18n: localized(content),
				status: {code: 2},
				subtitle,
				subtitle_i18n: localized(subtitle),
				title,
				title_i18n: localized(title),
			}),
			method: 'PATCH',
		});
	}

	function parseSuggestion(text) {
		const fields = {};

		for (const line of text.split('\n')) {
			const match = line.match(
				/^\s*(Problem|Suggestion|New title|New subtitle|New text)\s*:\s*(.+)$/i
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
			this.blocks = target.read();

			if (!this.blocks.length) {
				return;
			}

			this.renderToggle('Analyzing content...');

			try {
				const [clicks, views] = await Promise.all([
					getClicks(),
					getPageViews(),
				]);

				const totalClicks = this.blocks.reduce(
					(sum, block) => sum + (clicks.get(block.id.toLowerCase()) || 0),
					0
				);

				// Each block's share of all the clicks on the page drives both
				// the ranking and the badge; the rate per page view only goes
				// to the agent

				for (const block of this.blocks) {
					block.clicks = clicks.get(block.id.toLowerCase()) || 0;
					block.rate = views ? block.clicks / views : 0;
					block.share = totalClicks ? block.clicks / totalClicks : 0;
					block.total = this.blocks.length;
				}

				const average = 1 / this.blocks.length;

				this.analysis = {average, totalClicks, views};

				if (!totalClicks) {
					this.weak = [];

					this.renderToggle(`No clicks yet · ${RANGE_LABEL}`);

					return;
				}

				// A tie goes to the newest post (the highest asset id), so a
				// post nobody clicked yet is the first one to improve

				const ranked = [...this.blocks].sort(
					(a, b) =>
						a.share - b.share ||
						(Number(b.assetId) || 0) - (Number(a.assetId) || 0)
				);

				this.best = ranked[ranked.length - 1];

				// The block with the fewest clicks gets the red outline and the
				// AI button; the one with the most gets the green outline

				this.weak = ranked[0] === this.best ? [] : [ranked[0]];

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

			// A disposed advisor can still finish its LDP requests: it must
			// not draw anything after that

			if (this.disposed) {
				return;
			}

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
				'.ldp-advisor-badge, .ldp-advisor-backdrop'
			)) {
				element.remove();
			}

			for (const element of document.querySelectorAll(
				'.ldp-advisor-best, .ldp-advisor-weak'
			)) {
				element.classList.remove('ldp-advisor-best', 'ldp-advisor-weak');
			}
		}

		renderOutlines() {
			if (this.disposed) {
				return;
			}

			this.clear();

			if (!this.enabled) {
				return;
			}

			// Every block gets a label with its share of the clicks. The one
			// with the most clicks is outlined in green; the one with the
			// fewest in red, with the button that asks AI Hub for a fix.

			for (const block of this.blocks || []) {
				const badge = document.createElement('div');

				badge.className = 'ldp-advisor-badge';
				badge.innerHTML = `<span class="ldp-advisor-label">${percent(block.share)} of clicks</span>`;

				if (block === this.best) {
					block.element.classList.add('ldp-advisor-best');
				}
				else if ((this.weak || []).includes(block)) {
					block.element.classList.add('ldp-advisor-weak');

					const button = document.createElement('button');

					button.className = 'ldp-advisor-ai';
					button.innerHTML = `${AI_ICON}<span>Suggest improvements</span>`;
					button.type = 'button';

					button.setAttribute(
						'aria-label',
						`Ask AI Hub how to improve "${block.title}"`
					);

					button.addEventListener('click', (event) => {
						event.preventDefault();
						event.stopPropagation();

						this.openSuggestion(block);
					});

					badge.appendChild(button);
				}

				// Blog cards have no photo to float over, so the badge goes on
				// top of the card's text instead

				const body =
					target === TARGETS.blog &&
					block.element.querySelector('.sl-card__body');

				if (body) {
					badge.classList.add('ldp-advisor-badge--inline');
					body.prepend(badge);
				}
				else {
					block.element.appendChild(badge);
				}
			}
		}

		async openSuggestion(block) {
			for (const element of document.querySelectorAll('.ldp-advisor-backdrop')) {
				element.remove();
			}

			const backdrop = document.createElement('div');

			backdrop.className = 'ldp-advisor-backdrop';
			backdrop.innerHTML = `
				<div aria-label="AI suggestion" aria-modal="true" class="ldp-advisor-modal" role="dialog">
					<button aria-label="Close" class="ldp-advisor-close" type="button">&times;</button>
					<div class="ldp-advisor-modal__eyebrow">${AI_ICON}<span>AI suggestion · AI Hub</span></div>
					<h3>${escape(block.title)}</h3>
					<p class="ldp-advisor-modal__meta">${percent(block.share)} of clicks · position ${block.position} of ${block.total} · ${RANGE_LABEL}</p>
					<div class="ldp-advisor-modal__body"></div>
				</div>
			`;

			const close = () => {
				backdrop.remove();
				document.removeEventListener('keydown', onKeydown);
			};

			const onKeydown = (event) => {
				if (event.key === 'Escape') {
					close();
				}
			};

			backdrop.addEventListener('click', (event) => {
				if (
					event.target === backdrop ||
					event.target.closest('.ldp-advisor-close')
				) {
					close();
				}
			});

			document.addEventListener('keydown', onKeydown);
			document.body.appendChild(backdrop);

			backdrop.querySelector('.ldp-advisor-close').focus();

			const body = backdrop.querySelector('.ldp-advisor-modal__body');

			if (target === TARGETS.blog) {
				body.innerHTML =
					'<p class="ldp-advisor-modal__loading">Reading the post...</p>';

				try {
					await Promise.all([block, this.best].map(loadPost));
				}
				catch (error) {
					body.innerHTML = `<p class="ldp-advisor-modal__loading">Unable to read the post: ${escape(error.message)}</p>`;

					return;
				}
			}

			const contents = buildContext(block, this.best, this.analysis);
			const cached = this.suggestions.get(contents);

			if (cached) {
				body.innerHTML = cached.html;

				this.bindAccept(body, block, cached.fields);

				return;
			}

			body.innerHTML =
				'<p class="ldp-advisor-modal__loading">Asking AI Hub for ideas...</p>';

			try {
				const fields = parseSuggestion(await askAgentWithRetry(contents));

				const [kind, ...reason] = (fields.problem || '').split(' - ');

				const html = `
					${fields.problem ? `
						<section class="ldp-advisor-modal__section">
							<p class="ldp-advisor-modal__label">Why it underperforms</p>
							${reason.length ? `<span class="ldp-advisor-modal__problem">${escape(kind)}</span>` : ''}
							<p>${escape(reason.length ? reason.join(' - ') : fields.problem)}</p>
						</section>` : ''}
					${fields.suggestion ? `
						<section class="ldp-advisor-modal__section">
							<p class="ldp-advisor-modal__label">What to do</p>
							<p>${escape(fields.suggestion)}</p>
						</section>` : ''}
					${fields['new title'] || fields['new text'] ? `
						<section class="ldp-advisor-modal__section">
							<p class="ldp-advisor-modal__label">Suggested rewrite</p>
							<div class="ldp-advisor-modal__new">
								${fields['new title'] ? `<strong>${escape(fields['new title'])}</strong>` : ''}
								${fields['new subtitle'] ? `<em>${escape(fields['new subtitle'])}</em>` : ''}
								${fields['new text'] ? `<p>${escape(fields['new text'])}</p>` : ''}
							</div>
						</section>` : ''}
					${target.acceptable && fields['new title'] ? `
						<div class="ldp-advisor-modal__actions">
							<button class="ldp-advisor-accept" type="button">Accept and open in CMS</button>
							<span class="ldp-advisor-modal__hint">Saves this rewrite as a draft of the post and opens it in the CMS to review and publish.</span>
						</div>` : ''}
				`;

				this.suggestions.set(contents, {fields, html});

				body.innerHTML = html;

				this.bindAccept(body, block, fields);
			}
			catch (error) {
				body.innerHTML = `<p class="ldp-advisor-modal__loading">${escape(error.message)}</p>`;
			}
		}

		bindAccept(body, block, fields) {
			const button = body.querySelector('.ldp-advisor-accept');

			button?.addEventListener('click', async () => {
				button.disabled = true;
				button.textContent = 'Saving the draft...';

				try {
					const draft = await saveDraft(block, fields);

					button.outerHTML = `<a class="ldp-advisor-accept" href="/c/cms/edit_content_item?objectEntryId=${draft.id}" target="_blank">Open the draft in CMS &rarr;</a>`;

					window.open(
						`/c/cms/edit_content_item?objectEntryId=${draft.id}`,
						'_blank'
					);
				}
				catch (error) {
					button.disabled = false;
					button.textContent = `Try again (${error.message})`;
				}
			});
		}

		dispose() {
			this.disposed = true;

			this.clear();

			this.toggle?.remove();
			this.toggle = null;
		}
	}

	// A SPA navigation runs this script again. One registry on window keeps a
	// single advisor and a single endNavigate listener for the whole session,
	// so earlier runs never leave their toggle or labels behind.

	// The pages the advisor works on: the Surf Academy blocks of /learn and
	// the Surf Journal posts of /blog, each with its own click event and agent

	const TARGETS = {
		blog: {
			acceptable: true,
			agent: 'DEVCON_2026_LDP_POST_ADVISOR',
			attribute: 'postId',
			contextKey: 'post',
			event: 'surfBlogPostClicked',
			read: readBlogPosts,
			selector: '.sl-blog-card',
		},
		learn: {
			agent: 'DEVCON_2026_LDP_CONTENT_ADVISOR',
			attribute: 'contentId',
			contextKey: 'contents',
			event: 'surfContentClicked',
			read: readLearnBlocks,
			selector: '[data-content-id]',
		},
	};

	let target = TARGETS.learn;

	const registry = (window.__ldpContentAdvisor ??= {
		advisor: null,
		listening: false,
	});

	function start() {
		registry.advisor?.dispose();
		registry.advisor = null;

		if (!window.Liferay?.ThemeDisplay?.isSignedIn()) {
			return;
		}

		target = Object.values(TARGETS).find(({selector}) =>
			document.querySelector(selector)
		);

		if (!target) {
			return;
		}

		if (!document.getElementById('ldp-advisor-style')) {
			const style = document.createElement('style');

			style.id = 'ldp-advisor-style';
			style.textContent = STYLE;

			document.head.appendChild(style);
		}

		registry.advisor = new ContentAdvisor();

		registry.advisor.run();
	}

	registry.start = start;

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start);
	}
	else {
		start();
	}

	if (!registry.listening) {
		registry.listening = true;

		window.Liferay?.on?.('endNavigate', () => registry.start());
	}
})();
