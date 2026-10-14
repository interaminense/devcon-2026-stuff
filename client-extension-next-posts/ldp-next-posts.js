// Next posts: ranks the Swell Lab CMS blog posts by what LDP measured, asks an
// AI Hub agent for the next three posts, and saves any idea as a CMS draft

// The Swell Lab CMS space: its depot entry (for the analytics API) and its
// group (for the CMS blog API)
const SPACE_DEPOT_ENTRY_ID = 40942;
const SPACE_GROUP_ID = 40943;

// 7 = last 7 days (LDP leaves today out)
const RANGE_KEY = 7;

const AGENT_ERC = 'DEVCON_2026_LDP_NEXT_POSTS';

const STYLE = `
	<style>
		.ldp-next-posts {
			background: repeating-linear-gradient(-45deg, #fff8ec 0 14px, #fff3e0 14px 28px);
			border: 2px dashed #e0a458;
			border-radius: 20px;
			color: #1d2b36;
			display: block;
			font-family: Inter, system-ui, sans-serif;
			margin: 0 auto;
			max-width: 1140px;
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

		.ldp-next-posts .np-idea ul {
			padding-left: 18px;
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

// The posts of the space, with what LDP measured for each one. The analytics
// API lists only posts that already have data, so the CMS list is the base
async function getPosts() {
	const [blogs, performance] = await Promise.all([
		api(`/o/cms/blogs/scopes/${SPACE_GROUP_ID}?pageSize=50`),
		api(
			`/o/analytics-cms-rest/v1.0/performance-top-asset?depotEntryIds=${SPACE_DEPOT_ENTRY_ID}&rangeKey=${RANGE_KEY}&pageSize=50`
		),
	]);

	const metrics = new Map(
		performance.items.map((item) => [item.externalReferenceCode, item])
	);

	return blogs.items
		.filter((blog) => blog.status?.code === 0)
		.map((blog) => {
			const metric = metrics.get(blog.externalReferenceCode) || {};
			const impressions = metric.impressions || 0;
			const views = metric.views || 0;

			return {
				impressions,
				openRate: impressions ? views / impressions : null,
				subtitle: blog.subtitle || '',
				title: blog.title,
				views,
			};
		})
		.sort((a, b) => b.views - a.views || b.impressions - a.impressions);
}

// Plain text lines: the firewall in front of AI Hub rejects nested JSON
function describe(posts) {
	return [
		`period: last ${RANGE_KEY} days`,
		...posts.map((post, index) =>
			[
				`post ${index + 1}: ${post.title}`,
				`subtitle: ${post.subtitle}`,
				`impressions: ${post.impressions}`,
				`views: ${post.views}`,
				`open rate: ${post.openRate === null ? 'n/a' : Math.round(post.openRate * 100) + '%'}`,
			].join('; ')
		),
	].join('\n');
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

// The agent answers with labeled lines, one block per idea:
// Title: / Subtitle: / Why: / Outline: point; point; point
function parseIdeas(text) {
	return text
		.split(/^(?=Title:)/m)
		.map((block) => {
			const field = (label) =>
				block.match(new RegExp(`^${label}:\\s*(.*)$`, 'm'))?.[1]?.trim() ||
				'';

			return {
				outline: field('Outline')
					.split(';')
					.map((point) => point.trim())
					.filter(Boolean),
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
	const outline = idea.outline
		.map((point) => `<li>${escape(point)}</li>`)
		.join('');

	return api(`/o/cms/blogs/scopes/${SPACE_GROUP_ID}`, {
		body: JSON.stringify({
			content: `<p>${escape(idea.why)}</p><ul>${outline}</ul>`,
			status: {code: 2},
			subtitle: idea.subtitle,
			title: idea.title,
		}),
		method: 'POST',
	});
}

function formatRate(rate) {
	return rate === null ? '—' : `${Math.round(rate * 100)}%`;
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

			this.posts = await getPosts();

			this.render();
		}
		catch (error) {
			this.innerHTML = `${STYLE}<p class="np-status">Unable to load the posts: ${escape(error.message)}</p>`;
		}
	}

	render() {
		const rows = this.posts
			.map(
				(post) => `
					<tr>
						<td>${escape(post.title)}</td>
						<td>${post.impressions.toLocaleString()}</td>
						<td>${post.views.toLocaleString()}</td>
						<td>${formatRate(post.openRate)}</td>
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
					<span class="np-period">Surf Journal posts · last ${RANGE_KEY} days · Liferay Data Platform</span>
				</div>
				<button class="np-ask" type="button">✦ Suggest next posts</button>
			</div>
			<table>
				<thead>
					<tr><th>Post</th><th>Impressions</th><th>Views</th><th>Open rate</th></tr>
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
				answer = await askAgent(describe(this.posts));
			}
			catch {

				// The firewall in front of AI Hub refuses some calls for a few
				// seconds; one retry is enough

				await new Promise((resolve) => setTimeout(resolve, 4000));

				answer = await askAgent(describe(this.posts));
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
						<h3>${escape(idea.title)}</h3>
						<p>${escape(idea.subtitle)}</p>
						<p class="np-why">${escape(idea.why)}</p>
						<ul>${idea.outline.map((point) => `<li>${escape(point)}</li>`).join('')}</ul>
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
