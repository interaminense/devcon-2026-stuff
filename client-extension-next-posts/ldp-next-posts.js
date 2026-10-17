// Next posts: ranks the Swell Lab CMS blog posts by how often readers choose
// them from the post list (a custom event in LDP), asks an AI Hub agent for the
// next three posts, and saves any idea as a CMS draft

// The Swell Lab CMS space: its depot entry (for the analytics API) and its
// group (for the CMS blog API)
const SPACE_DEPOT_ENTRY_ID = 40942;
const SPACE_GROUP_ID = 40943;

// 7 = last 7 days (LDP leaves today out)
const RANGE_KEY = 7;

const AGENT_ERC = 'DEVCON_2026_LDP_NEXT_POSTS';

// The LDP property (channel) of the Swell Lab site
const CHANNEL_ID = '845351493326064678';

// The custom event that "Read the post" sends from the post list
const EVENT_NAME = 'surfBlogPostClicked';

const LIST_PATH = '/blog';

const STYLE = `
	<style>
		.ldp-next-posts {
			background: repeating-linear-gradient(-45deg, #fff8ec 0 14px, #fff3e0 14px 28px);
			border: 2px dashed #e0a458;
			border-radius: 20px;
			color: #1d2b36;
			display: block;
			font-family: Inter, system-ui, sans-serif;
			padding: 28px 32px;
		}

		.ldp-next-posts .np-badge {
			background: #1d2b36;
			border-radius: 999px;
			color: #ffd9a8;
			display: inline-block;
			font: 600 0.75rem Inter, sans-serif;
			letter-spacing: 0.06em;
			margin-bottom: 10px;
			padding: 4px 12px;
			text-transform: uppercase;
		}

		.ldp-next-posts table {
			background: #fff;
			border-radius: 12px;
		}

		.ldp-next-posts h2 {
			color: #0b4f6c;
			font: 700 1.5rem Poppins, Inter, sans-serif;
			margin: 0;
		}

		.ldp-next-posts .np-head {
			align-items: center;
			display: flex;
			flex-wrap: wrap;
			gap: 12px 24px;
			justify-content: space-between;
			margin-bottom: 18px;
		}

		.ldp-next-posts .np-period {
			color: #5b6b77;
			font-size: 0.875rem;
		}

		.ldp-next-posts table {
			border-collapse: collapse;
			width: 100%;
		}

		.ldp-next-posts th,
		.ldp-next-posts td {
			border-top: 1px solid rgba(11, 79, 108, 0.1);
			padding: 10px 8px;
			text-align: right;
		}

		.ldp-next-posts th:first-child,
		.ldp-next-posts td:first-child {
			text-align: left;
		}

		.ldp-next-posts th {
			border-top: 0;
			color: #5b6b77;
			font-size: 0.75rem;
			font-weight: 600;
			letter-spacing: 0.06em;
			text-transform: uppercase;
		}

		.ldp-next-posts td {
			font-variant-numeric: tabular-nums;
		}

		.ldp-next-posts .np-ask,
		.ldp-next-posts .np-draft {
			background: #0b4f6c;
			border: 0;
			border-radius: 999px;
			color: #fff;
			cursor: pointer;
			font: 600 0.9375rem Inter, sans-serif;
			padding: 10px 20px;
		}

		.ldp-next-posts .np-ask:disabled,
		.ldp-next-posts .np-draft:disabled {
			cursor: default;
			opacity: 0.6;
		}

		.ldp-next-posts .np-status {
			color: #5b6b77;
			margin: 18px 0 0;
		}

		.ldp-next-posts .np-ideas {
			display: grid;
			gap: 16px;
			grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
			margin-top: 20px;
		}

		.ldp-next-posts .np-idea {
			background: #fff;
			border-radius: 16px;
			display: flex;
			flex-direction: column;
			gap: 14px;
			padding: 18px;
		}

		.ldp-next-posts .np-idea p {
			margin: 0;
		}

		.ldp-next-posts .np-why {
			background: #eef4ff;
			border-radius: 12px;
			color: #1d2b36;
			display: grid;
			font-size: 0.875rem;
			gap: 6px;
			line-height: 1.5;
			padding: 12px 14px;
		}

		.ldp-next-posts .np-why__label,
		.ldp-next-posts .np-post__label {
			font: 700 0.6875rem/1 Inter, sans-serif;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}

		.ldp-next-posts .np-why__label {
			color: #3d5afe;
		}

		.ldp-next-posts .np-post {
			border: 1px solid rgba(11, 79, 108, 0.14);
			border-radius: 12px;
			display: grid;
			gap: 8px;
			padding: 14px 16px;
		}

		.ldp-next-posts .np-post__label {
			color: #5b6b77;
		}

		.ldp-next-posts .np-post h3 {
			color: #0b4f6c;
			font: 700 1.125rem/1.3 Poppins, Inter, sans-serif;
			margin: 0;
		}

		.ldp-next-posts .np-post__subtitle {
			color: #5b6b77;
			font-size: 0.9375rem;
		}

		.ldp-next-posts .np-preview {
			display: -webkit-box;
			font-size: 0.9375rem;
			line-height: 1.55;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 4;
			overflow: hidden;
		}

		.ldp-next-posts .np-draft {
			background: #0b4f6c;
			border: 0;
			border-radius: 999px;
			color: #fff;
			cursor: pointer;
			font: 600 0.9375rem Inter, sans-serif;
			padding: 10px 20px;
		}

		.ldp-next-posts .np-ask:disabled,
		.ldp-next-posts .np-draft:disabled {
			cursor: default;
			opacity: 0.6;
		}

		.ldp-next-posts .np-status {
			color: #5b6b77;
			margin: 18px 0 0;
		}

		.ldp-next-posts .np-ideas {
			display: grid;
			gap: 16px;
			grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
			margin-top: 20px;
		}

		.ldp-next-posts .np-idea {
			background: #fff;
			border-radius: 16px;
			display: flex;
			flex-direction: column;
			gap: 8px;
			padding: 20px;
		}

		.ldp-next-posts .np-idea h3 {
			color: #0b4f6c;
			font: 700 1.125rem Poppins, Inter, sans-serif;
			margin: 0;
		}

		.ldp-next-posts .np-idea p,
		.ldp-next-posts .np-idea ul {
			margin: 0;
		}

		.ldp-next-posts .np-why {
			color: #5b6b77;
			font-size: 0.875rem;
		}

		.ldp-next-posts .np-preview {
			display: -webkit-box;
			font-size: 0.9375rem;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 4;
			overflow: hidden;
		}

		.ldp-next-posts .np-draft {
			align-self: flex-start;
			margin-top: auto;
		}

		.ldp-next-posts .np-saved a {
			color: #0b4f6c;
			font-weight: 600;
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

function escape(text) {
	const element = document.createElement('span');

	element.textContent = text ?? '';

	return element.innerHTML;
}

async function query(text, variables) {
	const {data, errors} = await api('/o/analytics-rest/v1.0/graphql', {
		body: JSON.stringify({query: text, variables}),
		method: 'POST',
	});

	if (errors?.length) {
		throw new Error(errors[0].message);
	}

	return data;
}

// Clicks on "Read the post" come from the custom event, broken down by
// postId. LDP creates the event definition on the first click, so no
// definition just means no clicks yet.
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
		({name}) => name === 'postId'
	);

	if (!attribute) {
		return new Map();
	}

	const {eventAnalysisResult} = await query(
		`query ($attributeId: String!, $channelId: String!, $eventDefinitionId: String!, $rangeKey: Int) {
			eventAnalysisResult(analysisType: TOTAL, channelId: $channelId, compareToPrevious: false, eventAnalysisBreakdowns: [{attributeId: $attributeId, attributeType: EVENT, dataType: STRING, displayName: "postId", sortType: DESC}], eventDefinitionId: $eventDefinitionId, page: 0, rangeKey: $rangeKey, size: 50) {
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

	// LDP returns attribute values in lower case, so the keys are compared
	// in lower case too

	return new Map(
		(eventAnalysisResult?.breakdownItems || []).map(({name, value}) => [
			name.toLowerCase(),
			value || 0,
		])
	);
}

// How many times the post list itself was seen: the base of the click rate
async function getListViews() {
	const {page} = await query(
		`query ($channelId: String, $rangeKey: Int, $url: String) {
			page(canonicalUrl: $url, channelId: $channelId, rangeKey: $rangeKey) {
				viewsMetric {
					value
				}
			}
		}`,
		{
			channelId: CHANNEL_ID,
			rangeKey: RANGE_KEY,
			url: `${window.location.origin}${LIST_PATH}`,
		}
	);

	return page?.viewsMetric?.value || 0;
}

// The published posts of the space with their clicks from the list, their
// click rate, and their views from any source (links, search, the list)
async function getPosts() {
	const [blogs, performance, clicks, listViews] = await Promise.all([
		api(`/o/cms/blogs/scopes/${SPACE_GROUP_ID}?pageSize=50`),
		api(
			`/o/analytics-cms-rest/v1.0/performance-top-asset?depotEntryIds=${SPACE_DEPOT_ENTRY_ID}&rangeKey=${RANGE_KEY}&pageSize=50`
		),
		getClicks(),
		getListViews(),
	]);

	const views = new Map(
		performance.items.map((item) => [item.externalReferenceCode, item.views])
	);

	const posts = blogs.items
		.filter((blog) => blog.status?.code === 0)
		.map((blog) => {
			const postClicks =
				clicks.get(blog.externalReferenceCode.toLowerCase()) || 0;

			return {
				clickRate: listViews ? postClicks / listViews : null,
				clicks: postClicks,
				excerpt: (blog.contentRawText || '').trim().slice(0, 300),
				subtitle: blog.subtitle || '',
				title: blog.title,
				views: views.get(blog.externalReferenceCode) || 0,
			};
		})
		.sort((a, b) => b.clicks - a.clicks || b.views - a.views);

	return {listViews, posts};
}

// Plain text lines: the firewall in front of AI Hub rejects nested JSON
// The firewall in front of AI Hub reads "17 and 22" or "3 or 4" as SQL
// injection and answers 403 without CORS headers. Post excerpts can contain
// those, so they become "17 & 22" and "3 / 4".
function firewallSafe(text) {
	return text
		.replace(/(\d)\s+and\s+(\d)/gi, '$1 & $2')
		.replace(/(\d)\s+or\s+(\d)/gi, '$1 / $2');
}

// The agent gets the three posts readers chose most often from the list, with
// an excerpt of each, and only the titles of the others so it does not repeat
// them
function describe({listViews, posts}) {
	const top = posts.slice(0, 3);
	const others = posts.slice(3).map((post) => post.title);

	return [
		`period: last ${RANGE_KEY} days`,
		`post list views: ${listViews}`,
		...top.map((post, index) =>
			[
				`top post ${index + 1}: ${post.title}`,
				`subtitle: ${post.subtitle}`,
				`clicks from the list: ${post.clicks}`,
				`click rate: ${formatRate(post.clickRate)}`,
				`views from any source: ${post.views}`,
				`excerpt: ${post.excerpt.replace(/\s+/g, ' ')}`,
			].join('; ')
		),
		`other existing titles: ${others.join('; ') || 'none'}`,
	]
		.map(firewallSafe)
		.join('\n');
}

// AI Hub: the DXP issues a token, the browser subscribes to AI Hub's event
// stream, starts the agent with the stream key, and reads the answer from the
// event named after the agent
async function askAgent(text) {
	const token = await api('/o/ai-hub-cell/v1.0/authorization-tokens', {
		method: 'POST',
	});

	const stream = await fetch(
		`${token.serviceURL}/o/ai-hub/v1.0/agent-instances/subscribe`,
		{
			headers: {
				Accept: 'text/event-stream',
				Authorization: `Bearer ${token.accessToken}`,
			},
		}
	);

	const reader = stream.body.getReader();
	const decoder = new TextDecoder();

	let buffer = '';

	while (true) {
		const {done, value} = await reader.read();

		if (done) {
			throw new Error('AI Hub closed the stream.');
		}

		buffer += decoder.decode(value, {stream: true});

		let end;

		while ((end = buffer.indexOf('\n\n')) >= 0) {
			const block = buffer.slice(0, end);

			buffer = buffer.slice(end + 2);

			const name = block.match(/^event: ?(.*)$/m)?.[1];
			const data = block.match(/^data: ?(.*)$/m)?.[1];

			if (name === 'Subscribe') {
				const response = await fetch(
					`${token.serviceURL}/o/ai-hub/v1.0/agent-instances`,
					{
						body: JSON.stringify({
							agentDefinitionExternalReferenceCode: AGENT_ERC,
							context: {posts: text},
							sseEventSinkKey: data,
						}),
						headers: {
							'Authorization': `Bearer ${token.accessToken}`,
							'Content-Type': 'application/json',
							'Liferay-AI-Hub-Cell-On-Behalf-Of': token.userToken,
						},
						method: 'POST',
					}
				);

				if (!response.ok) {
					reader.cancel();

					throw new Error(`AI Hub returned ${response.status}`);
				}
			}
			else if (name === AGENT_ERC) {
				reader.cancel();

				return JSON.parse(data).data;
			}
		}
	}
}

// The agent answers one block per idea: Title:, Subtitle: and Why: lines,
// then Content: followed by one paragraph per line
function parseIdeas(text) {
	return text
		.split(/^(?=Title:)/m)
		.map((block) => {
			const field = (label) =>
				block.match(new RegExp(`^${label}:\\s*(.*)$`, 'm'))?.[1]?.trim() ||
				'';

			// An agent still on the older prompt answers Outline: instead of
			// Content:; its points become the paragraphs

			const content =
				block.split(/^Content:/m)[1] ||
				field('Outline').split(';').join('\n');

			return {
				paragraphs: content
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line && !/^(Title|Subtitle|Why):/.test(line)),
				subtitle: field('Subtitle'),
				title: field('Title'),
				why: field('Why'),
			};
		})
		.filter((idea) => idea.title)
		.slice(0, 3);
}

// A CMS draft: status code 2 keeps it out of the site until someone reviews
// and publishes it in the CMS
function createDraft(idea) {
	return api(`/o/cms/blogs/scopes/${SPACE_GROUP_ID}`, {
		body: JSON.stringify({
			content: idea.paragraphs
				.map((paragraph) => `<p>${escape(paragraph)}</p>`)
				.join(''),
			status: {code: 2},
			subtitle: idea.subtitle,
			title: idea.title,
		}),
		method: 'POST',
	});
}

function formatRate(rate) {
	return rate === null ? 'n/a' : `${Math.round(rate * 100)}%`;
}

class LdpNextPosts extends HTMLElement {
	async connectedCallback() {
		if (!Liferay.ThemeDisplay.isSignedIn()) {
			return;
		}

		try {

			// Only people who can add posts to the space see the card: the CMS
			// API returns the create action for them

			const blogs = await api(
				`/o/cms/blogs/scopes/${SPACE_GROUP_ID}?pageSize=1`
			);

			if (!blogs.actions?.create) {
				return;
			}

			this.classList.add('ldp-next-posts');

			this.innerHTML = `${STYLE}<p class="np-status">Loading the posts...</p>`;

			this.data = await getPosts();

			this.render();
		}
		catch (error) {
			this.innerHTML = `${STYLE}<p class="np-status">Unable to load the posts: ${escape(error.message)}</p>`;
		}
	}

	render() {
		const rows = this.data.posts
			.map(
				(post) => `
					<tr>
						<td>${escape(post.title)}</td>
						<td>${post.clicks.toLocaleString()}</td>
						<td>${formatRate(post.clickRate)}</td>
						<td>${post.views.toLocaleString()}</td>
					</tr>
				`
			)
			.join('');

		this.innerHTML = `
			${STYLE}
			<div class="np-head">
				<div>
					<span class="np-badge">Editors only · visitors don't see this</span>
					<h2>What should we write next?</h2>
					<span class="np-period">Surf Journal posts · last ${RANGE_KEY} days · ${this.data.listViews.toLocaleString()} views of the post list · Liferay Data Platform</span>
				</div>
				<button class="np-ask" type="button">✦ Suggest next posts</button>
			</div>
			<table>
				<thead>
					<tr><th>Post</th><th>Clicks from the list</th><th>Click rate</th><th>Views</th></tr>
				</thead>
				<tbody>${rows}</tbody>
			</table>
			<p class="np-status" hidden></p>
			<div class="np-ideas"></div>
		`;

		this.querySelector('.np-ask').addEventListener('click', () =>
			this.suggest()
		);
	}

	async suggest() {
		const button = this.querySelector('.np-ask');
		const status = this.querySelector('.np-status');
		const ideas = this.querySelector('.np-ideas');

		button.disabled = true;
		ideas.innerHTML = '';
		status.hidden = false;
		status.textContent = 'Asking AI Hub...';

		try {
			let answer;

			try {
				answer = await askAgent(describe(this.data));
			}
			catch {

				// The firewall in front of AI Hub refuses some calls for a few
				// seconds; one retry is enough

				await new Promise((resolve) => setTimeout(resolve, 4000));

				answer = await askAgent(describe(this.data));
			}

			this.ideas = parseIdeas(answer);

			status.hidden = true;

			this.renderIdeas();
		}
		catch (error) {
			status.textContent = `AI Hub is not available: ${error.message}`;
		}
		finally {
			button.disabled = false;
		}
	}

	renderIdeas() {
		const container = this.querySelector('.np-ideas');

		container.innerHTML = this.ideas
			.map(
				(idea, index) => `
					<article class="np-idea">
						<div class="np-why">
							<span class="np-why__label">✦ Why AI suggests this</span>
							<p>${escape(idea.why)}</p>
						</div>
						<div class="np-post">
							<span class="np-post__label">Draft post</span>
							<h3>${escape(idea.title)}</h3>
							<p class="np-post__subtitle">${escape(idea.subtitle)}</p>
							<p class="np-preview">${escape(idea.paragraphs[0] || '')}</p>
						</div>
						<button class="np-draft" data-index="${index}" type="button">Create draft in CMS</button>
					</article>
				`
			)
			.join('');

		container.querySelectorAll('.np-draft').forEach((button) =>
			button.addEventListener('click', async () => {
				button.disabled = true;
				button.textContent = 'Creating...';

				try {
					const draft = await createDraft(
						this.ideas[Number(button.dataset.index)]
					);

					button.outerHTML = `<p class="np-saved">Draft saved · <a href="/c/cms/edit_content_item?objectEntryId=${draft.id}" target="_blank">Open in CMS</a></p>`;
				}
				catch (error) {
					button.disabled = false;
					button.textContent = `Try again (${error.message})`;
				}
			})
		);
	}
}

customElements.define('ldp-next-posts', LdpNextPosts);
