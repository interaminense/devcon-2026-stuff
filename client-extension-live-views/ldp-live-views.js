// Live page views for signed-in users. Polls the LDP GraphQL proxy of the DXP
// and draws the views of the current page in the last 24 hours, plus the new
// views seen in the last minutes.

(() => {
	const CHANNEL_ID = '845351493326064678';

	const POLL_INTERVAL = 30000;

	const RECENT_POLLS = 20;

	const QUERY = `
		query LivePageViews($channelId: String, $url: String) {
			page(canonicalUrl: $url, channelId: $channelId, rangeKey: 0) {
				viewsMetric {
					histogram {
						metrics {
							key
							value
						}
					}
					value
				}
				visitorsMetric {
					value
				}
			}
		}
	`;

	const STYLE = `
		<style>
			.ldp-live {
				bottom: 20px;
				color: #1d2b36;
				font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
				position: fixed;
				right: 20px;
				z-index: 1000;
			}

			.ldp-live__pill,
			.ldp-live__panel {
				background: #ffffff;
				border-radius: 16px;
				box-shadow: 0 12px 32px rgba(11, 79, 108, 0.18);
			}

			.ldp-live__pill {
				align-items: center;
				border: 0;
				color: #0b4f6c;
				cursor: pointer;
				display: flex;
				font: inherit;
				font-size: 14px;
				font-weight: 600;
				gap: 10px;
				padding: 10px 16px;
			}

			.ldp-live__panel {
				padding: 16px 18px 14px;
				width: 340px;
			}

			.ldp-live__header {
				align-items: center;
				display: flex;
				justify-content: space-between;
			}

			.ldp-live__badge {
				align-items: center;
				color: #5b6b77;
				display: flex;
				font-size: 12px;
				font-weight: 600;
				gap: 8px;
				letter-spacing: 0.08em;
				text-transform: uppercase;
			}

			.ldp-live__dot {
				background: #20c9c3;
				border-radius: 50%;
				box-shadow: 0 0 0 0 rgba(32, 201, 195, 0.6);
				display: inline-block;
				height: 8px;
				width: 8px;
			}

			.ldp-live--polling .ldp-live__dot {
				animation: ldp-live-pulse 1.6s ease-out infinite;
			}

			.ldp-live--error .ldp-live__dot {
				animation: none;
				background: #c0392b;
			}

			@keyframes ldp-live-pulse {
				0% {
					box-shadow: 0 0 0 0 rgba(32, 201, 195, 0.6);
				}

				100% {
					box-shadow: 0 0 0 10px rgba(32, 201, 195, 0);
				}
			}

			.ldp-live__close {
				background: transparent;
				border: 0;
				border-radius: 8px;
				color: #5b6b77;
				cursor: pointer;
				font-size: 18px;
				line-height: 1;
				padding: 4px 8px;
			}

			.ldp-live__close:hover {
				background: #f1f2f5;
			}

			.ldp-live__page {
				color: #5b6b77;
				font-size: 13px;
				margin-top: 10px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.ldp-live__numbers {
				align-items: baseline;
				display: flex;
				gap: 16px;
				margin: 2px 0 10px;
			}

			.ldp-live__value {
				color: #0b4f6c;
				font-family: Poppins, Inter, sans-serif;
				font-size: 40px;
				font-weight: 700;
				line-height: 1.1;
				transition: transform 0.25s ease;
			}

			.ldp-live__value--bump {
				transform: scale(1.12);
			}

			.ldp-live__unit {
				color: #5b6b77;
				font-size: 13px;
			}

			.ldp-live__delta {
				background: rgba(32, 201, 195, 0.18);
				border-radius: 999px;
				color: #0b4f6c;
				font-size: 12px;
				font-weight: 700;
				opacity: 0;
				padding: 2px 8px;
				transition: opacity 0.3s ease;
			}

			.ldp-live__delta--show {
				opacity: 1;
			}

			.ldp-live__label {
				color: #5b6b77;
				display: flex;
				font-size: 11px;
				font-weight: 600;
				justify-content: space-between;
				letter-spacing: 0.06em;
				margin: 8px 0 4px;
				text-transform: uppercase;
			}

			.ldp-live__chart {
				display: block;
				overflow: visible;
				width: 100%;
			}

			.ldp-live__chart rect[data-tip] {
				cursor: default;
			}

			.ldp-live__axis {
				color: #8a96a0;
				display: flex;
				font-size: 11px;
				justify-content: space-between;
				margin-top: 2px;
			}

			.ldp-live__footer {
				color: #8a96a0;
				font-size: 11px;
				margin-top: 10px;
			}

			.ldp-live__tooltip {
				background: #1d2b36;
				border-radius: 6px;
				color: #ffffff;
				font-size: 12px;
				padding: 4px 8px;
				pointer-events: none;
				position: fixed;
				transform: translate(-50%, -120%);
				white-space: nowrap;
				z-index: 1001;
			}

			.ldp-live__sr {
				clip: rect(0 0 0 0);
				height: 1px;
				overflow: hidden;
				position: absolute;
				width: 1px;
			}
		</style>
	`;

	// LDP keys the Home page by the site root, with or without /home

	function getPageUrl() {
		const {origin, pathname} = window.location;

		const path = pathname.replace(/\/+$/, '');

		return ['', '/home', '/web/guest', '/web/guest/home'].includes(path)
			? origin
			: `${origin}${path}`;
	}

	async function fetchViews() {
		const response = await fetch('/o/analytics-rest/v1.0/graphql', {
			body: JSON.stringify({
				query: QUERY,
				variables: {channelId: CHANNEL_ID, url: getPageUrl()},
			}),
			headers: {
				'Content-Type': 'application/json',
				'x-csrf-token': Liferay.authToken,
			},
			method: 'POST',
		});

		if (!response.ok) {
			throw new Error(`The LDP proxy returned ${response.status}`);
		}

		const {data, errors} = await response.json();

		if (errors?.length) {
			throw new Error(errors[0].message);
		}

		const {viewsMetric, visitorsMetric} = data.page || {};

		return {
			hours: viewsMetric?.histogram?.metrics || [],
			total: viewsMetric?.value || 0,
			visitors: visitorsMetric?.value || 0,
		};
	}

	function formatHour(key) {
		return new Date(`${key}:00Z`).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function niceMax(value) {
		if (value <= 4) {
			return 4;
		}

		const magnitude = 10 ** Math.floor(Math.log10(value));

		return Math.ceil(value / magnitude) * magnitude;
	}

	function renderBars(values, {height, highlightLast, tips, width}) {
		const max = niceMax(Math.max(0, ...values));
		const slot = width / Math.max(values.length, 1);
		const barWidth = Math.min(24, Math.max(2, slot - 2));

		const bars = values
			.map((value, index) => {
				const barHeight = value ? Math.max(3, (value / max) * height) : 0;
				const x = index * slot + (slot - barWidth) / 2;
				const y = height - barHeight;
				const isLast = highlightLast && index === values.length - 1;
				const radius = Math.min(4, barWidth / 2, barHeight);

				const shape = barHeight
					? `<path d="M${x},${height} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + barWidth - radius} Q${x + barWidth},${y} ${x + barWidth},${y + radius} V${height} Z" fill="${isLast ? '#20c9c3' : '#0b4f6c'}" />`
					: '';

				const label =
					isLast && value
						? `<text fill="#1d2b36" font-size="11" font-weight="700" text-anchor="middle" x="${x + barWidth / 2}" y="${Math.max(10, y - 4)}">${value}</text>`
						: '';

				return `${shape}${label}<rect data-tip="${tips[index]}" fill="transparent" height="${height}" width="${slot}" x="${index * slot}" y="0" />`;
			})
			.join('');

		return `
			<svg class="ldp-live__chart" height="${height}" role="img" viewBox="0 0 ${width} ${height}">
				<line stroke="#e7e7ed" stroke-width="1" x1="0" x2="${width}" y1="${height - 0.5}" y2="${height - 0.5}" />
				${bars}
			</svg>
		`;
	}

	class LdpLiveViews extends HTMLElement {
		collapsed = false;
		error = null;
		lastUpdate = null;
		recent = [];
		state = null;
		timer = null;

		connectedCallback() {
			if (!window.Liferay?.ThemeDisplay?.isSignedIn()) {
				return;
			}

			this.classList.add('ldp-live');

			// Start minimized over the dashboard so it does not cover the cards

			this.collapsed = Boolean(document.querySelector('ldp-metric-card'));

			this.addEventListener('click', (event) => this.onClick(event));
			this.addEventListener('mousemove', (event) => this.onHover(event));
			this.addEventListener('mouseleave', () => this.hideTooltip());

			this.onVisibilityChange = () => {
				if (document.hidden) {
					this.stop();
				}
				else {
					this.start();
				}
			};

			document.addEventListener('visibilitychange', this.onVisibilityChange);

			this.clock = setInterval(() => this.renderFooter(), 1000);

			this.render();
			this.start();
		}

		disconnectedCallback() {
			this.stop();

			clearInterval(this.clock);

			document.removeEventListener(
				'visibilitychange',
				this.onVisibilityChange
			);

			this.hideTooltip();
		}

		start() {
			if (this.timer) {
				return;
			}

			this.poll();

			this.timer = setInterval(() => this.poll(), POLL_INTERVAL);
		}

		stop() {
			clearInterval(this.timer);

			this.timer = null;
		}

		async poll() {
			this.classList.add('ldp-live--polling');

			try {
				const next = await fetchViews();

				const delta = this.state ? Math.max(0, next.total - this.state.total) : 0;

				this.recent = [...this.recent, delta].slice(-RECENT_POLLS);
				this.error = null;
				this.lastUpdate = Date.now();
				this.state = next;

				this.classList.remove('ldp-live--error');

				this.render(delta);
			}
			catch (error) {
				console.error(error);

				this.error = error.message;

				this.classList.add('ldp-live--error');

				this.render();
			}
		}

		onClick(event) {
			if (event.target.closest('[data-action="collapse"]')) {
				this.collapsed = true;
			}
			else if (event.target.closest('[data-action="expand"]')) {
				this.collapsed = false;
			}
			else {
				return;
			}

			this.render();
		}

		onHover(event) {
			const target = event.target.closest('[data-tip]');

			if (!target) {
				this.hideTooltip();

				return;
			}

			if (!this.tooltip) {
				this.tooltip = document.createElement('div');
				this.tooltip.className = 'ldp-live__tooltip';

				document.body.appendChild(this.tooltip);
			}

			this.tooltip.textContent = target.dataset.tip;
			this.tooltip.style.left = `${event.clientX}px`;
			this.tooltip.style.top = `${event.clientY}px`;
		}

		hideTooltip() {
			this.tooltip?.remove();

			this.tooltip = null;
		}

		renderFooter() {
			const footer = this.querySelector('[data-role="footer"]');

			if (!footer) {
				return;
			}

			if (this.error) {
				footer.textContent = `Could not reach LDP: ${this.error}. Retrying every ${POLL_INTERVAL / 1000} s.`;

				return;
			}

			const seconds = this.lastUpdate
				? Math.round((Date.now() - this.lastUpdate) / 1000)
				: null;

			footer.textContent =
				seconds === null
					? 'Loading from Liferay Data Platform...'
					: `Liferay Data Platform · updated ${seconds} s ago`;
		}

		render(delta = 0) {
			const total = this.state?.total ?? null;
			const totalLabel = total === null ? '–' : total.toLocaleString();

			if (this.collapsed) {
				this.innerHTML = `
					${STYLE}
					<button class="ldp-live__pill" data-action="expand" type="button">
						<span class="ldp-live__dot"></span>
						<span aria-live="polite">${totalLabel} views in the last 24 h</span>
					</button>
				`;

				return;
			}

			const hours = this.state?.hours || [];

			const hoursChart = hours.length
				? renderBars(
						hours.map(({value}) => value),
						{
							height: 72,
							highlightLast: true,
							tips: hours.map(
								({key, value}) =>
									`${formatHour(key)} · ${value} ${value === 1 ? 'view' : 'views'}`
							),
							width: 304,
						}
					)
				: '<div class="ldp-live__axis">No views yet in the last 24 hours.</div>';

			const recent = Array.from(
				{length: RECENT_POLLS},
				(_, index) =>
					this.recent[this.recent.length - RECENT_POLLS + index] ?? 0
			);

			const recentChart = renderBars(recent, {
				height: 28,
				highlightLast: false,
				tips: recent.map((value, index) => {
					const secondsAgo = (RECENT_POLLS - 1 - index) * (POLL_INTERVAL / 1000);

					return `${secondsAgo ? `${Math.round(secondsAgo / 60 * 10) / 10} min ago` : 'now'} · +${value}`;
				}),
				width: 304,
			});

			const recentTotal = this.recent.reduce((sum, value) => sum + value, 0);

			this.innerHTML = `
				${STYLE}
				<section aria-label="Live page views" class="ldp-live__panel">
					<div class="ldp-live__header">
						<span class="ldp-live__badge"><span class="ldp-live__dot"></span>Live page views</span>
						<button aria-label="Minimize" class="ldp-live__close" data-action="collapse" type="button">&minus;</button>
					</div>

					<div class="ldp-live__page">${document.title.split(' - ')[0]}</div>

					<div class="ldp-live__numbers">
						<span aria-live="polite" class="ldp-live__value${delta ? ' ldp-live__value--bump' : ''}">${totalLabel}</span>
						<span class="ldp-live__unit">views · ${this.state?.visitors ?? '–'} visitors · last 24 h</span>
						<span class="ldp-live__delta${delta ? ' ldp-live__delta--show' : ''}">+${delta}</span>
					</div>

					<div class="ldp-live__label"><span>Views per hour</span><span>now</span></div>
					${hoursChart}
					${
						hours.length
							? `<div class="ldp-live__axis"><span>${formatHour(hours[0].key)}</span><span>${formatHour(hours[hours.length - 1].key)}</span></div>`
							: ''
					}

					<div class="ldp-live__label"><span>New views, last ${(RECENT_POLLS * POLL_INTERVAL) / 60000} min</span><span>+${recentTotal}</span></div>
					${recentChart}

					<table class="ldp-live__sr">
						<caption>Views per hour in the last 24 hours</caption>
						<tbody>
							${hours.map(({key, value}) => `<tr><th scope="row">${formatHour(key)}</th><td>${value}</td></tr>`).join('')}
						</tbody>
					</table>

					<div class="ldp-live__footer" data-role="footer"></div>
				</section>
			`;

			this.renderFooter();

			if (delta) {
				setTimeout(() => {
					this.querySelector('.ldp-live__value')?.classList.remove(
						'ldp-live__value--bump'
					);
				}, 400);
			}
		}
	}

	if (!customElements.get('ldp-live-views')) {
		customElements.define('ldp-live-views', LdpLiveViews);
	}

	// Loaded as a JavaScript client extension, the script adds the element to
	// every page itself. As a Custom Element client extension, the widget
	// renders it instead.

	function mount() {
		if (
			window.Liferay?.ThemeDisplay?.isSignedIn() &&
			!document.querySelector('ldp-live-views')
		) {
			document.body.appendChild(document.createElement('ldp-live-views'));
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mount);
	}
	else {
		mount();
	}
})();
