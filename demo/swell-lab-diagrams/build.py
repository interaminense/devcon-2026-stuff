"""The Swell Lab client extensions, one diagram each: the applications as boxes, the calls as numbered arrows."""

import html
import pathlib

e = html.escape

OUT = pathlib.Path(__file__).parent / 'swell-lab-diagrams.html'

W = 1170
BROWSER_X, BROWSER_W = 30, 220
GROUP_X, GROUP_W = 350, 390
SUB_X, SUB_W, SUB_H = 375, 340, 62
RIGHT_X, RIGHT_W = 850, 290
TOP, STEP = 60, 82


def row_y(i):
	return TOP + i * STEP


def row_mid(i):
	return row_y(i) + SUB_H / 2


def box(x, y, w, h, title, sub, cls):
	return (
		f'<rect class="box {cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="10"/>'
		f'<text class="name" x="{x + 16}" y="{y + 26}">{e(title)}</text>'
		f'<text class="path" x="{x + 16}" y="{y + 46}">{e(sub)}</text>'
	)


def badge(x, y, n, app):
	return (
		f'<circle class="badge {app}" cx="{x}" cy="{y}" r="13"/>'
		f'<text class="badge-n" x="{x}" y="{y + 4.5}" text-anchor="middle">{n}</text>'
	)


def line(x1, y1, x2, y2, app, start=False, end=True):
	marker = f'url(#a-{app})'
	s = f' marker-start="{marker}"' if start else ''
	t = f' marker-end="{marker}"' if end else ''

	return f'<line class="line {app}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"{s}{t}/>'


def badges(x1, x2, y, numbers, app):
	if len(numbers) == 1:
		return badge((x1 + x2) / 2, y, numbers[0], app)

	gap = (x2 - x1) / (len(numbers) + 1)

	return ''.join(badge(x1 + gap * (i + 1), y, n, app) for i, n in enumerate(numbers))


def render(diagram):
	subs, rights, arrows = diagram['subs'], diagram['rights'], diagram['arrows']
	rows = len(subs)
	bottom = row_y(rows - 1) + SUB_H
	route_y = bottom + 60
	has_route = any(a[0] == 'route' for a in arrows)
	height = (route_y + 50) if has_route else (bottom + 36)
	parts = []

	def add(steps, markup):
		parts.append((tuple(steps), markup))

	sub_steps = {i: [] for i in range(rows)}
	right_steps = {key: [] for key in rights}

	for arrow in arrows:
		kind = arrow[0]

		if kind in ('browser', 'right'):
			sub_steps[arrow[1]] += arrow[2]

		if kind == 'right':
			for key, (_, _, first, last, _) in rights.items():
				if first <= arrow[1] <= last:
					right_steps[key] += arrow[2]
		elif kind == 'down':
			sub_steps[arrow[1]] += arrow[3]
			sub_steps[arrow[2]] += arrow[3]
		elif kind == 'route':
			right_steps[arrow[1]] += arrow[2]

	add([0], f'<rect class="group dxp" x="{GROUP_X}" y="16" width="{GROUP_W}" height="{bottom + 20 - 16}" rx="14"/>'
		f'<text class="group-name dxp" x="{GROUP_X + 25}" y="44">DXP</text>')

	b_top, b_bottom = row_y(0) - 10, bottom
	title, sub = diagram['browser']
	browser = (
		f'<rect class="box browser" x="{BROWSER_X}" y="{b_top}" width="{BROWSER_W}" height="{b_bottom - b_top}" rx="12"/>'
		f'<text class="name" x="{BROWSER_X + 18}" y="{b_top + 30}">Browser</text>'
		f'<text class="path" x="{BROWSER_X + 18}" y="{b_top + 52}">{e(title)}</text>'
	)

	if sub:
		browser += f'<text class="path" x="{BROWSER_X + 18}" y="{b_top + 72}">{e(sub)}</text>'

	add([0], browser)

	for i, (title, sub) in enumerate(subs):
		add(sorted(sub_steps[i]), box(SUB_X, row_y(i), SUB_W, SUB_H, title, sub, 'dxp'))

	right_boxes = {}

	for key, (title, sub, first, last, app) in rights.items():
		y, h = row_y(first), row_y(last) + SUB_H - row_y(first)
		right_boxes[key] = (y, h)
		add(sorted(right_steps[key]), box(RIGHT_X, y, RIGHT_W, h, title, sub, app))

	left, sub_end = BROWSER_X + BROWSER_W, SUB_X + SUB_W

	def add_badges(x1, x2, y, numbers, app):
		if len(numbers) == 1:
			add(numbers, badge((x1 + x2) / 2, y, numbers[0], app))

			return

		gap = (x2 - x1) / (len(numbers) + 1)

		for i, n in enumerate(numbers):
			add([n], badge(x1 + gap * (i + 1), y, n, app))

	for arrow in arrows:
		kind = arrow[0]

		if kind == 'browser':
			_, i, numbers, app, direction = arrow
			y = row_mid(i)

			if direction == 'in':
				add(numbers, line(SUB_X - 4, y, left + 4, y, 'dxp'))
			else:
				add(numbers, line(left + 4, y, SUB_X - 4, y, 'dxp', start=direction == 'both'))

			add_badges(left, SUB_X, y, numbers, app)
		elif kind == 'right':
			_, i, numbers, app = arrow
			y = row_mid(i)
			add(numbers, line(sub_end + 4, y, RIGHT_X - 4, y, app, start=True))
			add_badges(sub_end, RIGHT_X, y, numbers, app)
		elif kind == 'down':
			_, i, j, numbers, app = arrow
			x = SUB_X + SUB_W - 40
			add(numbers, line(x, row_y(i) + SUB_H + 3, x, row_y(j) - 3, app)
				+ badge(x - 26, (row_y(i) + SUB_H + row_y(j)) / 2, numbers[0], app))
		elif kind == 'route':
			_, key, numbers, app, label = arrow
			y, h = right_boxes[key]
			bx = BROWSER_X + BROWSER_W / 2
			rx = RIGHT_X + RIGHT_W / 2
			add(numbers,
				f'<path class="line {app}" d="M{bx} {b_bottom + 4} V{route_y} H{rx} V{y + h + 4}" '
				f'marker-start="url(#a-{app})" marker-end="url(#a-{app})"/>'
				f'<text class="route {app}" x="{(bx + rx) / 2}" y="{route_y + 32}" text-anchor="middle">{e(label)}</text>')
			add_badges(bx, rx, route_y, numbers, app)

	defs = '<defs>' + ''.join(
		f'<marker id="a-{app}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head {app}" d="M0 0 L10 5 L0 10 z"/></marker>'
		for app in ('dxp', 'ldp', 'hub')
	) + '</defs>'

	last = max(n for arrow in arrows for n in (arrow[3] if arrow[0] == 'down' else arrow[2]))
	body = ''.join(
		f'<g class="an-g" data-s="{min(steps)}" data-now="{" ".join(map(str, steps))}">{markup}</g>'
		for steps, markup in parts
	)
	dots = ''.join(
		f'<button class="walk-dot" type="button" data-step="{n}" aria-label="Step {n}">{n}</button>'
		for n in range(1, last + 1)
	) + f'<button class="walk-dot" type="button" data-step="{last + 1}" aria-label="Full diagram">✓</button>'

	return f'''
<section class="card walk" id="{diagram['id']}" data-last="{last + 1}">
	<div class="card-head">
		<h2><span class="num">{e(diagram['num'])}</span>{e(diagram['title'])}</h2>
		<div class="walk-controls">
			<button class="walk-btn" type="button" data-act="prev" aria-label="Previous step">&lsaquo;</button>
			<button class="walk-btn walk-play" type="button" data-act="play">Play</button>
			<button class="walk-btn" type="button" data-act="next" aria-label="Next step">&rsaquo;</button>
			<div class="walk-dots">{dots}</div>
		</div>
	</div>
	<div class="scroll"><svg role="img" aria-label="{e(diagram['title'])}" viewBox="0 0 {W} {height}" xmlns="http://www.w3.org/2000/svg">{defs}{body}</svg></div>
</section>'''


LDP = 'LDP'
HUB = ('AI Hub', 'agent → LLM')

DIAGRAMS = [
	{
		'id': 'live-views',
		'num': '1',
		'title': 'Page views, last 24 hours',
		'browser': ('any page · signed in', 'polls every 30 s'),
		'subs': [
			('Client Extensions', 'Global JS · ldp-live-views'),
			('Analytics proxy', 'page(canonicalUrl, rangeKey: 0)'),
		],
		'rights': {'ldp': (LDP, 'page views · last 24 h', 1, 1, 'ldp')},
		'arrows': [
			('browser', 0, [1], 'dxp', 'in'),
			('browser', 1, [2], 'ldp', 'both'),
			('right', 1, [2], 'ldp'),
		],
	},
	{
		'id': 'dashboard',
		'num': '2',
		'title': 'Custom dashboard page',
		'browser': ('Swell Lab Dashboard', 'metric cards + behavior'),
		'subs': [
			('Page template', 'Swell Lab Dashboard · fragments'),
			('Client Extensions', 'ldp-metric-card · visitors-behavior'),
			('Analytics settings', '/o/analytics-settings-rest/…/channels'),
			('Analytics proxy', 'site · pages · visitFrequency'),
			('Objects API', '/o/c/ldpmetriccards'),
			('AI Hub connection', '/o/ai-hub-cell/v1.0/…tokens'),
		],
		'rights': {
			'ldp': (LDP, 'GraphQL · property channel', 3, 3, 'ldp'),
			'hub': (*HUB, 5, 5, 'hub'),
		},
		'arrows': [
			('browser', 0, [1], 'dxp', 'in'),
			('browser', 1, [2], 'dxp', 'in'),
			('browser', 2, [3], 'dxp', 'both'),
			('browser', 3, [4], 'ldp', 'both'),
			('right', 3, [4], 'ldp'),
			('browser', 4, [5], 'dxp', 'both'),
			('browser', 5, [6], 'hub', 'both'),
			('right', 5, [6], 'hub'),
			('route', 'hub', [7], 'hub', 'browser ⇄ AI Hub, cross-origin'),
		],
	},
	{
		'id': 'blogs',
		'num': '3',
		'title': 'Blogs',
		'browser': ('/blog · post page', 'sl-blog-card × N'),
		'subs': [
			('CMS 2.0', 'CMSBlog · Swell Lab space'),
			('Page Management', 'collection display · display page'),
		],
		'rights': {'ldp': (LDP, 'views · impressions · events', 0, 1, 'ldp')},
		'arrows': [
			('down', 0, 1, [1], 'dxp'),
			('browser', 1, [2], 'dxp', 'in'),
			('route', 'ldp', [3], 'ldp', 'Analytics.track(surfBlogPostClicked)'),
		],
	},
	{
		'id': 'blogs-advisor',
		'num': '3.1',
		'title': 'Blogs: most viewed and least viewed',
		'browser': ('/blog · editor', 'best · weakest card'),
		'subs': [
			('Client Extensions', 'Global JS · ldp-content-advisor'),
			('Analytics proxy', 'eventAnalysisResult · page'),
			('CMS 2.0 API', '/o/cms/blogs/{id} · GET, PATCH'),
			('AI Hub connection', '/o/ai-hub-cell/v1.0/…tokens'),
			('CMS editor', '/c/cms/edit_content_item'),
		],
		'rights': {
			'ldp': (LDP, 'surfBlogPostClicked by postId', 1, 1, 'ldp'),
			'hub': (*HUB, 3, 3, 'hub'),
		},
		'arrows': [
			('browser', 0, [1], 'dxp', 'in'),
			('browser', 1, [2], 'ldp', 'both'),
			('right', 1, [2], 'ldp'),
			('browser', 2, [3, 6], 'dxp', 'both'),
			('browser', 3, [4], 'hub', 'both'),
			('right', 3, [4], 'hub'),
			('browser', 4, [7], 'dxp', 'out'),
			('route', 'hub', [5], 'hub', 'POST_ADVISOR agent, cross-origin'),
		],
	},
	{
		'id': 'blogs-next-posts',
		'num': '3.2',
		'title': 'Blogs: suggested next posts',
		'browser': ('/blog · editor', 'three post ideas'),
		'subs': [
			('Client Extensions', 'Custom Element · ldp-next-posts'),
			('CMS 2.0 API', '/o/cms/blogs/scopes/… · GET, POST'),
			('Analytics proxy', 'eventAnalysisResult'),
			('Analytics CMS API', '/o/analytics-cms-rest/…/top-asset'),
			('AI Hub connection', '/o/ai-hub-cell/v1.0/…tokens'),
		],
		'rights': {
			'ldp': (LDP, 'clicks · list views', 2, 3, 'ldp'),
			'hub': (*HUB, 4, 4, 'hub'),
		},
		'arrows': [
			('browser', 0, [1], 'dxp', 'in'),
			('browser', 1, [2, 7], 'dxp', 'both'),
			('browser', 2, [3], 'ldp', 'both'),
			('right', 2, [3], 'ldp'),
			('browser', 3, [4], 'ldp', 'both'),
			('right', 3, [4], 'ldp'),
			('browser', 4, [5], 'hub', 'both'),
			('right', 4, [5], 'hub'),
			('route', 'hub', [6], 'hub', 'NEXT_POSTS agent, cross-origin'),
		],
	},
]

page = f'''<title>Swell Lab Diagrams</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&amp;family=JetBrains+Mono:wght@400;600&amp;display=swap">
<style>
/* Layout: one column of diagram cards, same lanes in each: browser, DXP, external services. */
:root {{
	--bg: #00072b;
	--surface: #0a1145;
	--surface-2: #141c5c;
	--line: #27307a;
	--fg: #ffffff;
	--muted: #a3abd6;
	--c-dxp: #3d7bff;
	--c-ldp: #00c2fb;
	--c-hub: #e500bd;
	--display: 'Source Sans 3', 'Source Sans Pro', 'Segoe UI', system-ui, sans-serif;
	--mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
	color-scheme: dark;
}}
* {{ box-sizing: border-box; }}
body {{
	background: var(--bg);
	color: var(--fg);
	font: 18px/1.5 var(--display);
	padding-left: max(16px, env(safe-area-inset-left, 0px));
	padding-right: max(16px, env(safe-area-inset-right, 0px));
}}
.wrap {{ display: grid; gap: 32px; margin: 0 auto; max-width: 1200px; padding-block: 40px 80px; }}
header {{ align-items: end; display: flex; flex-wrap: wrap; gap: 12px 24px; justify-content: space-between; }}
h1 {{ font-size: clamp(30px, 5vw, 44px); font-weight: 700; margin: 0; text-wrap: balance; }}
.legend {{ display: flex; flex-wrap: wrap; font-size: 16px; gap: 8px 18px; }}
.legend span {{ align-items: center; display: flex; gap: 8px; }}
.legend span::before {{ background: var(--c); border-radius: 3px; content: ""; height: 12px; width: 12px; }}
.legend .dxp {{ --c: var(--c-dxp); }}
.legend .ldp {{ --c: var(--c-ldp); }}
.legend .hub {{ --c: var(--c-hub); }}
.card {{ background: var(--surface); border: 1px solid var(--line); border-radius: 16px; display: grid; gap: 16px; padding: 24px; }}
h2 {{ align-items: center; display: flex; font-size: 26px; font-weight: 700; gap: 14px; margin: 0; text-wrap: balance; }}
.num {{ align-items: center; border: 1px solid var(--c-hub); border-radius: 10px; color: var(--c-hub); display: inline-flex; font: 700 18px/1 var(--mono); height: 40px; justify-content: center; min-width: 40px; padding: 0 8px; }}
.scroll {{ overflow-x: auto; }}
svg {{ display: block; height: auto; min-width: 780px; width: 100%; }}
.dxp {{ --c: var(--c-dxp); }}
.ldp {{ --c: var(--c-ldp); }}
.hub {{ --c: var(--c-hub); }}
.group {{ fill: color-mix(in srgb, var(--c) 5%, transparent); stroke: var(--c); stroke-dasharray: 6 5; stroke-opacity: 0.7; }}
.group-name {{ fill: var(--c); font: 700 18px var(--display); }}
.box {{ fill: color-mix(in srgb, var(--c) 12%, var(--bg)); stroke: var(--c); stroke-width: 1.5; }}
.box.browser {{ fill: var(--bg); stroke: var(--fg); stroke-opacity: 0.4; }}
.name {{ fill: var(--fg); font: 700 16px var(--display); }}
.path {{ fill: var(--muted); font: 13px var(--mono); }}
.line {{ fill: none; stroke: var(--c); stroke-width: 2; }}
.head {{ fill: var(--c); }}
.badge {{ fill: var(--c); }}
.badge-n {{ fill: var(--bg); font: 700 13px var(--mono); }}
.route {{ fill: var(--c); font: 13px var(--mono); }}
.card-head {{ align-items: center; display: flex; flex-wrap: wrap; gap: 12px 24px; justify-content: space-between; }}
.walk-controls {{ align-items: center; display: flex; flex-wrap: wrap; gap: 8px; }}
.walk-btn {{ background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; color: var(--fg); cursor: pointer; font: 600 16px/1 var(--display); min-width: 40px; padding: 10px 12px; }}
.walk-btn:hover, .walk-btn:focus-visible {{ border-color: var(--c-hub); }}
.walk-play {{ min-width: 76px; }}
.walk-dots {{ display: flex; flex-wrap: wrap; gap: 6px; margin-left: 6px; }}
.walk-dot {{ background: transparent; border: 1px solid var(--line); border-radius: 50%; color: var(--muted); cursor: pointer; font: 600 12px/1 var(--mono); height: 28px; padding: 0; width: 28px; }}
.walk-dot.is-done {{ border-color: var(--c-hub); color: var(--fg); }}
.walk-dot.is-now {{ background: var(--c-hub); border-color: var(--c-hub); color: var(--fg); }}
.an-g {{ transition: opacity 0.5s ease; }}
.an-g.is-hidden {{ opacity: 0; }}
.an-g.is-past {{ opacity: 0.3; }}
.an-g.is-now .line {{ animation: an-flow 0.9s linear infinite; stroke-dasharray: 9 6; stroke-width: 2.6; }}
.an-g.is-now .box {{ filter: drop-shadow(0 0 8px color-mix(in srgb, var(--c) 70%, transparent)); }}
@keyframes an-flow {{ to {{ stroke-dashoffset: -30; }} }}
@media (prefers-reduced-motion: reduce) {{
	* {{ animation: none !important; transition: none !important; }}
}}
</style>

<div class="wrap">
	<header>
		<h1>Swell Lab Client Extensions</h1>
		<p class="legend"><span class="dxp">DXP</span><span class="ldp">LDP</span><span class="hub">AI Hub</span></p>
	</header>
	{''.join(render(d) for d in DIAGRAMS)}
</div>
<script>
(() => {{
	const DELAY = 2600;

	for (const card of document.querySelectorAll('.walk')) {{
		const last = Number(card.dataset.last);
		const groups = [...card.querySelectorAll('.an-g')];
		const dots = [...card.querySelectorAll('.walk-dot')];
		const play = card.querySelector('[data-act="play"]');
		let step = last;
		let timer = null;

		const show = (next) => {{
			step = Math.min(Math.max(next, 1), last);
			const done = step === last;

			for (const group of groups) {{
				const first = Number(group.dataset.s);
				const now = group.dataset.now.split(' ').map(Number);

				group.classList.toggle('is-hidden', first > step);
				group.classList.toggle('is-now', !done && now.includes(step));
				group.classList.toggle('is-past', !done && first > 0 && first <= step && !now.includes(step));
			}}

			for (const dot of dots) {{
				const s = Number(dot.dataset.step);

				dot.classList.toggle('is-now', s === step);
				dot.classList.toggle('is-done', s < step);
			}}
		}};

		const stop = () => {{
			clearInterval(timer);
			timer = null;
			play.textContent = 'Play';
		}};

		const start = () => {{
			show(step === last ? 1 : step);
			clearInterval(timer);
			play.textContent = 'Pause';
			timer = setInterval(() => {{
				show(step + 1);

				if (step === last) {{
					stop();
				}}
			}}, DELAY);
		}};

		play.addEventListener('click', () => (timer ? stop() : start()));
		card.querySelector('[data-act="prev"]').addEventListener('click', () => {{
			stop();
			show(step - 1);
		}});
		card.querySelector('[data-act="next"]').addEventListener('click', () => {{
			stop();
			show(step + 1);
		}});

		for (const dot of dots) {{
			dot.addEventListener('click', () => {{
				stop();
				show(Number(dot.dataset.step));
			}});
		}}

		show(last);
	}}
}})();
</script>
'''

OUT.write_text(page)
print(OUT, len(page))
