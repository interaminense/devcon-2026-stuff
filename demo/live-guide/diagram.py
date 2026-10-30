"""How the demo card works: the applications as boxes, the calls as numbered arrows."""

import html

e = html.escape

W, H = 1150, 620

BROWSER = (30, 40, 220, 462)
DXP = (350, 16, 440, 506)
SUB_X, SUB_W, SUB_H = 375, 320, 62
SUBS = [
	('Client Extensions', 'Type: Custom Element', 60),
	('Documents and Media', 'Hosts the JS, injected via the CX', 142),
	('LDP proxy', '/o/analytics-rest/v1.0/graphql', 224),
	('Objects API', '/o/c/democardconfigs', 306),
	('AI Hub connection', '/o/ai-hub-cell/v1.0/…tokens', 440),
]
RIGHT_X, RIGHT_W = 890, 230
RIGHT = [
	('LDP', 'GraphQL · property channel', 224, ' app-ldp'),
	('LLM', 'runs the prompt', 300, ' app-hub dg-soft'),
	('AI Hub', 'na1.hub.liferay.com · agent', 440, ' app-hub'),
]

FLOW = [
	('dxp', 'Client Extensions puts <code>&lt;ldp-demo-card&gt;</code> on the page, pointing to the card&rsquo;s JS URL.'),
	('dxp', 'The browser loads the card code from Documents and Media.'),
	('ldp', 'The card asks the LDP proxy for its metric. DXP forwards the GraphQL query to LDP.'),
	('dxp', 'The card loads and saves its metric in the Objects API, one entry per widget instance.'),
	('hub', 'The card asks DXP for an AI Hub token. DXP signs in with the Client ID and Secret.'),
	('hub', 'The card sends its numbers to the AI Hub agent. The LLM writes the insight shown under the chart.'),
]


def box(x, y, w, h, title, sub, cls=''):
	return (
		f'<rect class="dg-box{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="10"/>'
		f'<text class="dg-name" x="{x + 16}" y="{y + 26}">{e(title)}</text>'
		f'<text class="dg-path" x="{x + 16}" y="{y + 46}">{e(sub)}</text>'
	)


def badge(x, y, n, cls=''):
	return (
		f'<circle class="dg-badge{cls}" cx="{x}" cy="{y}" r="13"/>'
		f'<text class="dg-badge-n" x="{x}" y="{y + 4.5}" text-anchor="middle">{n}</text>'
	)


def arrow(x1, y1, x2, y2, both=False, cls='', prefix='dg-a'):
	marker = next((f'{prefix}-{app}' for app in ('dxp', 'ldp', 'hub') if f'app-{app}' in cls), prefix)
	start = f' marker-start="url(#{marker})"' if both else ''

	return f'<line class="dg-line{cls}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"{start} marker-end="url(#{marker})"/>'


def mini_card(x, y, label, value, trend, direction, points, insight=False):
	w, h = 192, 210 if insight else 140
	px = [x + 14 + i * ((w - 28) / (len(points) - 1)) for i in range(len(points))]
	low, high = min(points), max(points)
	py = [y + 118 - (p - low) / (high - low) * 30 for p in points]
	line = ' '.join(f'{a:.1f},{b:.1f}' for a, b in zip(px, py))
	parts = [
		f'<rect class="dg-card" x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/>',
		f'<text class="dg-card-label" x="{x + 14}" y="{y + 24}">{e(label)}</text>',
		f'<text class="dg-card-value" x="{x + 14}" y="{y + 56}">{e(value)}</text>',
		f'<text class="dg-card-trend dg-{direction}" x="{x + 14}" y="{y + 76}">{e(trend)}</text>',
		f'<polyline class="dg-spark dg-{direction}" points="{line}"/>',
		f'<circle class="dg-spark-dot dg-{direction}" cx="{px[-1]:.1f}" cy="{py[-1]:.1f}" r="3"/>',
	]

	if insight:
		parts.append(f'<text class="dg-card-ai" x="{x + 14}" y="{y + 150}">✦ AI insight</text>')
		parts.append(f'<rect class="dg-card-text" x="{x + 14}" y="{y + 162}" width="{w - 28}" height="6" rx="3"/>')
		parts.append(f'<rect class="dg-card-text" x="{x + 14}" y="{y + 176}" width="{w - 60}" height="6" rx="3"/>')
		parts.append(f'<rect class="dg-card-text" x="{x + 14}" y="{y + 190}" width="{w - 90}" height="6" rx="3"/>')

	return ''.join(parts)


def render():
	bx, by, bw, bh = BROWSER
	dx, dy, dw, dh = DXP
	parts = []

	parts.append(f'<rect class="dg-group app-dxp" x="{dx}" y="{dy}" width="{dw}" height="{dh}" rx="14"/>')
	parts.append(f'<text class="dg-group-name app-dxp" x="{dx + 25}" y="{dy + 30}">DXP</text>')

	parts.append(f'<rect class="dg-box dg-browser" x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="12"/>')
	parts.append(f'<text class="dg-name" x="{bx + 18}" y="{by + 30}">Browser</text>')
	parts.append(f'<text class="dg-path" x="{bx + 18}" y="{by + 52}">Demo page · 2 instances</text>')
	parts.append(mini_card(bx + 14, by + 72, 'Unique visitors', '1,284', '▲ 12.4%', 'up', [30, 26, 34, 31, 40, 37, 46]))
	parts.append(mini_card(bx + 14, by + 232, 'Sessions per visitor', '1.9', '▲ 37.7%', 'up', [30, 34, 31, 36, 37, 39, 44], insight=True))

	for title, sub, y in SUBS:
		parts.append(box(SUB_X, y, SUB_W, SUB_H, title, sub, ' app-dxp'))

	link_edge = SUB_X + SUB_W
	link_x = link_edge + 24
	cx_mid, dm_mid = 60 + SUB_H / 2, 142 + SUB_H / 2
	parts.append(
		f'<path class="dg-line app-dxp dg-dashed" d="M{link_edge + 2} {cx_mid} H{link_x} V{dm_mid} H{link_edge + 4}" '
		f'marker-end="url(#dg-a-dxp)"/>'
	)
	parts.append(f'<text class="dg-path" x="{link_x + 10}" y="{(cx_mid + dm_mid) / 2 + 4}">JS URL</text>')

	for title, sub, y, cls in RIGHT:
		parts.append(box(RIGHT_X, y, RIGHT_W, SUB_H, title, sub, cls))

	mid = {title: y + SUB_H / 2 for title, _, y in SUBS}
	left, right_edge = bx + bw, SUB_X
	sub_end = SUB_X + SUB_W
	a_mid = (left + right_edge) / 2
	r_mid = (dx + dw + RIGHT_X) / 2

	parts.append(arrow(right_edge - 4, mid['Client Extensions'], left + 4, mid['Client Extensions'], cls=' app-dxp'))
	parts.append(badge(a_mid, mid['Client Extensions'], 1, ' app-dxp'))
	parts.append(arrow(right_edge - 4, mid['Documents and Media'], left + 4, mid['Documents and Media'], cls=' app-dxp'))
	parts.append(badge(a_mid, mid['Documents and Media'], 2, ' app-dxp'))

	y3 = mid['LDP proxy']
	parts.append(arrow(left + 4, y3, right_edge - 4, y3, both=True, cls=' app-dxp'))
	parts.append(badge(a_mid, y3, 3, ' app-ldp'))
	parts.append(arrow(sub_end + 4, y3, RIGHT_X - 4, y3, both=True, cls=' app-ldp'))
	parts.append(badge(r_mid, y3, 3, ' app-ldp'))

	y4 = mid['Objects API']
	parts.append(arrow(left + 4, y4, right_edge - 4, y4, both=True, cls=' app-dxp'))
	parts.append(badge(a_mid, y4, 4, ' app-dxp'))

	y5 = mid['AI Hub connection']
	parts.append(arrow(left + 4, y5, right_edge - 4, y5, both=True, cls=' app-dxp'))
	parts.append(badge(a_mid, y5, 5, ' app-hub'))
	parts.append(arrow(sub_end + 4, y5, RIGHT_X - 4, y5, both=True, cls=' app-hub'))
	parts.append(badge(r_mid, y5, 5, ' app-hub'))

	hub_x = RIGHT_X + RIGHT_W / 2
	hub_bottom = 440 + SUB_H
	route_y = 568
	browser_x = bx + bw / 2
	parts.append(
		f'<path class="dg-line app-hub" d="M{browser_x} {by + bh + 4} V{route_y} H{hub_x} V{hub_bottom + 4}" '
		f'marker-start="url(#dg-a-hub)" marker-end="url(#dg-a-hub)"/>'
	)
	parts.append(badge((browser_x + hub_x) / 2, route_y, 6, ' app-hub'))
	parts.append(f'<text class="dg-route app-hub" x="{(browser_x + hub_x) / 2}" y="{route_y + 32}" text-anchor="middle">browser ⇄ AI Hub, cross-origin</text>')

	parts.append(arrow(hub_x, 440 - 4, hub_x, 300 + SUB_H + 4, both=True, cls=' app-hub'))
	parts.append(badge(hub_x + 28, (440 + 300 + SUB_H) / 2, 6, ' app-hub'))

	defs = '''<defs>
	<marker id="dg-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head" d="M0 0 L10 5 L0 10 z"/></marker>
	<marker id="dg-a-dxp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head app-dxp" d="M0 0 L10 5 L0 10 z"/></marker>
	<marker id="dg-a-ldp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head app-ldp" d="M0 0 L10 5 L0 10 z"/></marker>
	<marker id="dg-a-hub" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head app-hub" d="M0 0 L10 5 L0 10 z"/></marker>
</defs>'''

	svg = (
		'<svg role="img" aria-label="The demo card in the browser loads from Documents and Media, reads LDP through the DXP LDP proxy, stores its configuration in the Objects API, gets an AI Hub token from DXP, and then talks to AI Hub directly, which runs the LLM." '
		f'viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">{defs}{"".join(parts)}</svg>'
	)

	return f'''
<section class="diagram" id="diagram">
	<h2 class="agenda-title">Diagram Flow</h2>
	<div class="diagram-scroll">{svg}</div>
	<p class="dg-legend"><span class="app-dxp">DXP</span><span class="app-ldp">LDP</span><span class="app-hub">AI Hub</span></p>
	<ol class="dg-steps">{''.join(f'<li><span class="dg-step-n app-{app}">{n}</span><span>{text}</span></li>' for n, (app, text) in enumerate(FLOW, 1))}</ol>
</section>'''


WALK = [
	('Setup', 'Upload ldp-demo-card.js to Documents and Media, then register it in Client Extensions with its JS URL.'),
	('Page', 'DXP renders the demo page with two ldp-demo-card widgets and a script tag for the JS URL.'),
	('Script', 'The browser loads the card code from Documents and Media. Each widget becomes a live card.'),
	('Metric', 'Each card asks the LDP proxy, with the user\'s session. DXP forwards the GraphQL query to LDP and returns value, previous value and trend.'),
	('Config', 'Each card saves its metric in Objects, keyed by its widget instance. After a reload, every card remembers its own setup.'),
	('Token', 'DXP signs in to AI Hub with the Client ID and Secret, and hands the card a short-lived token.'),
	('Insight', 'The card calls the AI Hub agent directly. The LLM runs the prompt, and the insight shows up under the chart.'),
	('The full picture', 'One card, five building blocks, no new backend.'),
]


def render_walkthrough(heading='Animated Walkthrough', play=True, captions=True):
	bx, by, bw, bh = BROWSER
	dx, dy, dw, dh = DXP
	groups = {}

	def add(step, markup):
		groups.setdefault(step, []).append(markup)

	add(1, f'<rect class="dg-group app-dxp" x="{dx}" y="{dy}" width="{dw}" height="{dh}" rx="14"/>')
	add(1, f'<text class="dg-group-name app-dxp" x="{dx + 25}" y="{dy + 30}">DXP</text>')

	browser = (
		f'<rect class="dg-box dg-browser" x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="12"/>'
		f'<text class="dg-name" x="{bx + 18}" y="{by + 30}">Browser</text>'
	)
	add(1, browser)
	add(2, f'<text class="dg-path" x="{bx + 18}" y="{by + 52}">Demo page · 2 instances</text>')

	cards = [
		(bx + 14, by + 72, 'Unique visitors', '1,284', '▲ 12.4%', 'up', [30, 26, 34, 31, 40, 37, 46], False),
		(bx + 14, by + 232, 'Sessions per visitor', '1.9', '▲ 37.7%', 'up', [30, 34, 31, 36, 37, 39, 44], True),
	]

	for x, y, label, value, trend, direction, points, insight in cards:
		w, h = 192, 210 if insight else 140
		px = [x + 14 + i * ((w - 28) / (len(points) - 1)) for i in range(len(points))]
		low, high = min(points), max(points)
		py = [y + 118 - (p - low) / (high - low) * 30 for p in points]
		line = ' '.join(f'{a:.1f},{b:.1f}' for a, b in zip(px, py))
		add(3, f'<rect class="dg-card" x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/>'
			f'<text class="dg-card-label" x="{x + 14}" y="{y + 24}">{e(label)}</text>')
		add(4, f'<text class="dg-card-value" x="{x + 14}" y="{y + 56}">{e(value)}</text>'
			f'<text class="dg-card-trend dg-{direction}" x="{x + 14}" y="{y + 76}">{e(trend)}</text>'
			f'<polyline class="dg-spark dg-{direction}" points="{line}"/>'
			f'<circle class="dg-spark-dot dg-{direction}" cx="{px[-1]:.1f}" cy="{py[-1]:.1f}" r="3"/>')
		add(5, f'<text class="dg-card-saved" x="{x + w - 14}" y="{y + 24}" text-anchor="end">✓ saved</text>')

		if insight:
			add(7, f'<text class="dg-card-ai" x="{x + 14}" y="{y + 150}">✦ AI insight</text>'
				f'<rect class="dg-card-text" x="{x + 14}" y="{y + 162}" width="{w - 28}" height="6" rx="3"/>'
				f'<rect class="dg-card-text" x="{x + 14}" y="{y + 176}" width="{w - 60}" height="6" rx="3"/>'
				f'<rect class="dg-card-text" x="{x + 14}" y="{y + 190}" width="{w - 90}" height="6" rx="3"/>')

	sub_step = {'Client Extensions': 1, 'Documents and Media': 1, 'LDP proxy': 4, 'Objects API': 5, 'AI Hub connection': 6}

	for title, sub, y in SUBS:
		add(sub_step[title], box(SUB_X, y, SUB_W, SUB_H, title, sub, ' app-dxp'))

	link_edge = SUB_X + SUB_W
	link_x = link_edge + 24
	cx_mid, dm_mid = 60 + SUB_H / 2, 142 + SUB_H / 2
	add(1, f'<path class="dg-line app-dxp dg-dashed" d="M{link_edge + 4} {cx_mid} H{link_x} V{dm_mid} H{link_edge + 2}" marker-start="url(#an-a-dxp)"/>'
		f'<text class="dg-path" x="{link_x + 10}" y="{(cx_mid + dm_mid) / 2 + 4}">JS URL</text>')

	right_step = {'LDP': 4, 'LLM': 7, 'AI Hub': 6}

	for title, sub, y, cls in RIGHT:
		add(right_step[title], box(RIGHT_X, y, RIGHT_W, SUB_H, title, sub, cls))

	mid = {title: y + SUB_H / 2 for title, _, y in SUBS}
	left, right_edge = bx + bw, SUB_X
	sub_end = SUB_X + SUB_W
	a_mid = (left + right_edge) / 2
	r_mid = (dx + dw + RIGHT_X) / 2

	def an_arrow(*args, **kwargs):
		return arrow(*args, prefix='an-a', **kwargs)

	add(2, an_arrow(right_edge - 4, mid['Client Extensions'], left + 4, mid['Client Extensions'], cls=' app-dxp') + badge(a_mid, mid['Client Extensions'], 1, ' app-dxp'))
	add(3, an_arrow(right_edge - 4, mid['Documents and Media'], left + 4, mid['Documents and Media'], cls=' app-dxp') + badge(a_mid, mid['Documents and Media'], 2, ' app-dxp'))

	y3 = mid['LDP proxy']
	add(4, an_arrow(left + 4, y3, right_edge - 4, y3, both=True, cls=' app-dxp') + badge(a_mid, y3, 3, ' app-ldp')
		+ an_arrow(sub_end + 4, y3, RIGHT_X - 4, y3, both=True, cls=' app-ldp') + badge(r_mid, y3, 3, ' app-ldp'))

	y4 = mid['Objects API']
	add(5, an_arrow(left + 4, y4, right_edge - 4, y4, both=True, cls=' app-dxp') + badge(a_mid, y4, 4, ' app-dxp'))

	y5 = mid['AI Hub connection']
	add(6, an_arrow(left + 4, y5, right_edge - 4, y5, both=True, cls=' app-dxp') + badge(a_mid, y5, 5, ' app-hub')
		+ an_arrow(sub_end + 4, y5, RIGHT_X - 4, y5, both=True, cls=' app-hub') + badge(r_mid, y5, 5, ' app-hub'))

	hub_x = RIGHT_X + RIGHT_W / 2
	hub_bottom = 440 + SUB_H
	route_y = 568
	browser_x = bx + bw / 2
	add(7, f'<path class="dg-line app-hub" d="M{browser_x} {by + bh + 4} V{route_y} H{hub_x} V{hub_bottom + 4}" marker-start="url(#an-a-hub)" marker-end="url(#an-a-hub)"/>'
		+ badge((browser_x + hub_x) / 2, route_y, 6, ' app-hub')
		+ f'<text class="dg-route app-hub" x="{(browser_x + hub_x) / 2}" y="{route_y + 32}" text-anchor="middle">browser ⇄ AI Hub, cross-origin</text>'
		+ an_arrow(hub_x, 440 - 4, hub_x, 300 + SUB_H + 4, both=True, cls=' app-hub') + badge(hub_x + 28, (440 + 300 + SUB_H) / 2, 6, ' app-hub'))

	defs = '<defs>' + ''.join(
		f'<marker id="an-a-{app}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head app-{app}" d="M0 0 L10 5 L0 10 z"/></marker>'
		for app in ('dxp', 'ldp', 'hub')
	) + '</defs>'

	body = ''.join(f'<g class="an-g" data-s="{step}">{"".join(groups[step])}</g>' for step in sorted(groups))
	svg = (
		'<svg role="img" aria-label="Step-by-step animation of how the demo card works." '
		f'viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">{defs}{body}</svg>'
	)
	dots = ''.join(
		f'<button class="walk-dot" type="button" data-step="{i}" aria-label="Step {i}: {e(title)}">{i if i < len(WALK) else "✓"}</button>'
		for i, (title, _) in enumerate(WALK, 1)
	)
	captions = '' if not captions else ''.join(
		f'<div class="walk-caption" data-step="{i}" hidden><span class="walk-n">{i if i < len(WALK) else "All"}</span><div><h3>{e(title)}</h3><p>{e(text)}</p></div></div>'
		for i, (title, text) in enumerate(WALK, 1)
	)

	return f'''
<section class="diagram walk" id="walk" data-steps="{len(WALK)}">
	<h2 class="agenda-title">{heading}</h2>
	<div class="diagram-scroll">{svg}</div>
	<div class="walk-bar">
		<div class="walk-captions" aria-live="polite">{captions}</div>
		<div class="walk-controls">
			<button class="walk-btn" id="walk-prev" type="button" aria-label="Previous step">&lsaquo;</button>
			{'<button class="walk-btn walk-play" id="walk-play" type="button">Pause</button>' if play else ''}
			<button class="walk-btn" id="walk-next" type="button" aria-label="Next step">&rsaquo;</button>
			<div class="walk-dots">{dots}</div>
		</div>
	</div>
</section>'''


# The fragment version: the code and each card's configuration live in the
# fragment and in the page, so there is no Documents and Media, no Client
# Extension and no Object
FRAGMENT_SUBS = [
	('Fragments', 'LDP Fragment Card · HTML, CSS, JS', 60),
	('Fragment configuration', 'Metric and time range, per card', 142),
	('LDP proxy', '/o/analytics-rest/v1.0/graphql', 224),
	('AI Hub connection', '/o/ai-hub-cell/v1.0/…tokens', 440),
]

FRAGMENT_WALK = [
	('Setup', 'Create LDP Fragment Card in Design, Fragments: its HTML, CSS, JavaScript and Configuration live in the fragment.'),
	('Page', 'DXP renders the demo page with two instances of the fragment, each with its code inline. No upload, no script URL.'),
	('Metric', 'Each card asks the LDP proxy, with the user\'s session. DXP forwards the GraphQL query to LDP and returns value, previous value and trend.'),
	('Config', 'Each instance gets its own configuration, metric and time range, picked in the page editor and saved with the page.'),
	('Token', 'DXP signs in to AI Hub with the Client ID and Secret, and hands the card a short-lived token.'),
	('Insight', 'The card calls the AI Hub agent directly. The LLM runs the prompt, and the insight shows up under the chart.'),
	('The full picture', 'One fragment, four building blocks, no new backend.'),
]


def render_fragment_walkthrough(heading='Diagram Flow'):
	bx, by, bw, bh = BROWSER
	dx, dy, dw, dh = DXP
	groups = {}

	def add(step, markup):
		groups.setdefault(step, []).append(markup)

	def an_arrow(*args, **kwargs):
		return arrow(*args, prefix='an-a', **kwargs)

	add(1, f'<rect class="dg-group app-dxp" x="{dx}" y="{dy}" width="{dw}" height="{dh}" rx="14"/>')
	add(1, f'<text class="dg-group-name app-dxp" x="{dx + 25}" y="{dy + 30}">DXP</text>')
	add(1, f'<rect class="dg-box dg-browser" x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="12"/>'
		f'<text class="dg-name" x="{bx + 18}" y="{by + 30}">Browser</text>')
	add(2, f'<text class="dg-path" x="{bx + 18}" y="{by + 52}">Demo page · 2 instances</text>')

	cards = [
		(bx + 14, by + 72, 'Unique visitors', '7 days', '1,284', '▲ 12.4%', 'up', [30, 26, 34, 31, 40, 37, 46], False),
		(bx + 14, by + 232, 'Sessions per visitor', '24 hours', '1.9', '▲ 37.7%', 'up', [30, 34, 31, 36, 37, 39, 44], True),
	]

	for x, y, label, period, value, trend, direction, points, insight in cards:
		w, h = 192, 210 if insight else 140
		px = [x + 14 + i * ((w - 28) / (len(points) - 1)) for i in range(len(points))]
		low, high = min(points), max(points)
		py = [y + 118 - (p - low) / (high - low) * 30 for p in points]
		line = ' '.join(f'{a:.1f},{b:.1f}' for a, b in zip(px, py))
		add(2, f'<rect class="dg-card" x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/>')
		add(2, f'<text class="dg-card-label" x="{x + 14}" y="{y + 24}">{e(label)}</text>')
		add(4, f'<text class="dg-card-saved" x="{x + w - 14}" y="{y + 24}" text-anchor="end">{e(period)}</text>')
		add(3, f'<text class="dg-card-value" x="{x + 14}" y="{y + 56}">{e(value)}</text>'
			f'<text class="dg-card-trend dg-{direction}" x="{x + 14}" y="{y + 76}">{e(trend)}</text>'
			f'<polyline class="dg-spark dg-{direction}" points="{line}"/>'
			f'<circle class="dg-spark-dot dg-{direction}" cx="{px[-1]:.1f}" cy="{py[-1]:.1f}" r="3"/>')

		if insight:
			add(6, f'<text class="dg-card-ai" x="{x + 14}" y="{y + 150}">✦ AI insight</text>'
				f'<rect class="dg-card-text" x="{x + 14}" y="{y + 162}" width="{w - 28}" height="6" rx="3"/>'
				f'<rect class="dg-card-text" x="{x + 14}" y="{y + 176}" width="{w - 60}" height="6" rx="3"/>'
				f'<rect class="dg-card-text" x="{x + 14}" y="{y + 190}" width="{w - 90}" height="6" rx="3"/>')

	sub_step = {'Fragments': 1, 'LDP proxy': 3, 'Fragment configuration': 4, 'AI Hub connection': 5}

	for title, sub, y in FRAGMENT_SUBS:
		add(sub_step[title], box(SUB_X, y, SUB_W, SUB_H, title, sub, ' app-dxp'))

	right_step = {'LDP': 3, 'LLM': 6, 'AI Hub': 5}

	for title, sub, y, cls in RIGHT:
		add(right_step[title], box(RIGHT_X, y, RIGHT_W, SUB_H, title, sub, cls))

	mid = {title: y + SUB_H / 2 for title, _, y in FRAGMENT_SUBS}
	left, right_edge = bx + bw, SUB_X
	sub_end = SUB_X + SUB_W
	a_mid = (left + right_edge) / 2
	r_mid = (dx + dw + RIGHT_X) / 2

	add(2, an_arrow(right_edge - 4, mid['Fragments'], left + 4, mid['Fragments'], cls=' app-dxp') + badge(a_mid, mid['Fragments'], 1, ' app-dxp'))
	y3 = mid['LDP proxy']
	add(3, an_arrow(left + 4, y3, right_edge - 4, y3, both=True, cls=' app-dxp') + badge(a_mid, y3, 2, ' app-ldp')
		+ an_arrow(sub_end + 4, y3, RIGHT_X - 4, y3, both=True, cls=' app-ldp') + badge(r_mid, y3, 2, ' app-ldp'))

	add(4, an_arrow(right_edge - 4, mid['Fragment configuration'], left + 4, mid['Fragment configuration'], cls=' app-dxp') + badge(a_mid, mid['Fragment configuration'], 3, ' app-dxp'))

	y4 = mid['AI Hub connection']
	add(5, an_arrow(left + 4, y4, right_edge - 4, y4, both=True, cls=' app-dxp') + badge(a_mid, y4, 4, ' app-hub')
		+ an_arrow(sub_end + 4, y4, RIGHT_X - 4, y4, both=True, cls=' app-hub') + badge(r_mid, y4, 4, ' app-hub'))

	hub_x = RIGHT_X + RIGHT_W / 2
	hub_bottom = 440 + SUB_H
	route_y = 568
	browser_x = bx + bw / 2
	add(6, f'<path class="dg-line app-hub" d="M{browser_x} {by + bh + 4} V{route_y} H{hub_x} V{hub_bottom + 4}" marker-start="url(#an-a-hub)" marker-end="url(#an-a-hub)"/>'
		+ badge((browser_x + hub_x) / 2, route_y, 5, ' app-hub')
		+ f'<text class="dg-route app-hub" x="{(browser_x + hub_x) / 2}" y="{route_y + 32}" text-anchor="middle">browser ⇄ AI Hub, cross-origin</text>'
		+ an_arrow(hub_x, 440 - 4, hub_x, 300 + SUB_H + 4, both=True, cls=' app-hub') + badge(hub_x + 28, (440 + 300 + SUB_H) / 2, 5, ' app-hub'))

	defs = '<defs>' + ''.join(
		f'<marker id="an-a-{app}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head app-{app}" d="M0 0 L10 5 L0 10 z"/></marker>'
		for app in ('dxp', 'ldp', 'hub')
	) + '</defs>'

	body = ''.join(f'<g class="an-g" data-s="{step}">{"".join(groups[step])}</g>' for step in sorted(groups))
	svg = (
		'<svg role="img" aria-label="Step-by-step animation of how the fragment card works." '
		f'viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">{defs}{body}</svg>'
	)
	dots = ''.join(
		f'<button class="walk-dot" type="button" data-step="{i}" aria-label="Step {i}: {e(title)}">{i if i < len(FRAGMENT_WALK) else "✓"}</button>'
		for i, (title, _) in enumerate(FRAGMENT_WALK, 1)
	)

	return f'''
<section class="diagram walk" id="walk" data-steps="{len(FRAGMENT_WALK)}">
	<h2 class="agenda-title">{heading}</h2>
	<div class="diagram-scroll">{svg}</div>
	<div class="walk-bar">
		<div class="walk-captions" aria-live="polite"></div>
		<div class="walk-controls">
			<button class="walk-btn" id="walk-prev" type="button" aria-label="Previous step">&lsaquo;</button>
			<button class="walk-btn" id="walk-next" type="button" aria-label="Next step">&rsaquo;</button>
			<div class="walk-dots">{dots}</div>
		</div>
	</div>
</section>'''


# The notification flow: from the Notify marketing team click to the bell of
# everyone in the Marketing Team role who can view the alert
NOTIFY_WALK = [
	('Setup', 'The card shows an AI insight and the Notify marketing team button. Sam, from the marketing team, is signed in on another browser.'),
	('Click', 'The card posts the alert to the Object REST API with the user session.'),
	('Saved', 'DXP stores the alert as an Insight Alert entry: metric, period, insight and page.'),
	('Trigger', 'The Object Action On After Add fires for the new entry.'),
	('Template', 'The action runs the notification template, which fills the subject with the entry fields.'),
	('Recipients', 'The template goes to the Marketing Team role; only users who can view the entry get it.'),
	('Bell', 'Sam\'s bell lights up with the insight.'),
	('The full picture', 'The card only saves an alert; the Object decides who hears about it.'),
]

NOTIFY_BOXES = [
	('REST API', 'POST /o/c/insightalerts', 56),
	('Insight Alert entry', 'metric · period · insight · page', 150),
	('Object Action', 'On After Add → Notification', 244),
	('Notification Template', 'User Notification · [%INSIGHTALERT_…%]', 338),
	('Role Marketing Team', 'only users who can view the alert', 432),
]


def render_notification_walkthrough(heading='Notification Flow'):
	groups = {}

	def add(step, markup):
		groups.setdefault(step, []).append(markup)

	def an_arrow(*args, **kwargs):
		return arrow(*args, prefix='an-a', **kwargs)

	bx, by, bw, bh = 30, 40, 250, 470
	dx, dy, dw, dh = 330, 16, 470, 560
	sx, sy, sw, sh = 870, 40, 250, 470
	box_x, box_w = dx + 25, dw - 50

	add(1, f'<rect class="dg-group app-dxp" x="{dx}" y="{dy}" width="{dw}" height="{dh}" rx="14"/>'
		f'<text class="dg-group-name app-dxp" x="{dx + 25}" y="{dy + 30}">DXP</text>')

	add(1, f'<rect class="dg-box dg-browser" x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="12"/>'
		f'<text class="dg-name" x="{bx + 18}" y="{by + 30}">Your browser</text>'
		f'<text class="dg-path" x="{bx + 18}" y="{by + 52}">Demo page · LDP Fragment Card</text>')

	cx, cy, cw, ch = bx + 14, by + 72, bw - 28, 300
	add(1, f'<rect class="dg-card" x="{cx}" y="{cy}" width="{cw}" height="{ch}" rx="8"/>'
		f'<text class="dg-card-label" x="{cx + 14}" y="{cy + 24}">Unique visitors</text>'
		f'<text class="dg-card-value" x="{cx + 14}" y="{cy + 58}">19</text>'
		f'<text class="dg-card-trend dg-down" x="{cx + 14}" y="{cy + 80}">▼ 66.1%</text>'
		f'<text class="dg-card-ai" x="{cx + 14}" y="{cy + 118}">✦ AI insight</text>'
		f'<rect class="dg-card-text" x="{cx + 14}" y="{cy + 132}" width="{cw - 28}" height="6" rx="3"/>'
		f'<rect class="dg-card-text" x="{cx + 14}" y="{cy + 146}" width="{cw - 50}" height="6" rx="3"/>'
		f'<rect class="dg-card-text" x="{cx + 14}" y="{cy + 160}" width="{cw - 80}" height="6" rx="3"/>'
		f'<rect class="dg-box app-dxp" x="{cx + 14}" y="{cy + 196}" width="{cw - 28}" height="36" rx="8"/>'
		f'<text class="dg-name" x="{cx + cw / 2}" y="{cy + 219}" text-anchor="middle">📣 Notify marketing team</text>')
	add(3, f'<text class="dg-card-saved" x="{cx + cw / 2}" y="{cy + 258}" text-anchor="middle">✓ Marketing team notified</text>')

	add(1, f'<rect class="dg-box dg-browser" x="{sx}" y="{sy}" width="{sw}" height="{sh}" rx="12"/>'
		f'<text class="dg-name" x="{sx + 18}" y="{sy + 30}">Sam\'s browser</text>'
		f'<text class="dg-path" x="{sx + 18}" y="{sy + 52}">Marketing Team role · 2nd window</text>'
		f'<text class="dg-name" x="{sx + sw - 34}" y="{sy + 34}" text-anchor="middle">🔔</text>')

	mids = {}

	for step, (title, sub, y) in enumerate(NOTIFY_BOXES, 2):
		add(step, box(box_x, y, box_w, SUB_H, title, sub, ' app-dxp'))
		mids[title] = y + SUB_H / 2

	button_y = cy + 214
	elbow_x = (bx + bw + box_x) / 2
	add(2, f'<path class="dg-line app-dxp" d="M{cx + cw + 2} {button_y} H{elbow_x} V{mids["REST API"]} H{box_x - 4}" marker-end="url(#an-a-dxp)"/>'
		+ badge(elbow_x, (button_y + mids['REST API']) / 2, 1, ' app-dxp'))

	center_x = box_x + box_w / 2

	for step, (upper, lower) in enumerate(zip(NOTIFY_BOXES, NOTIFY_BOXES[1:]), 3):
		top, bottom = upper[2] + SUB_H, lower[2]
		add(step, an_arrow(center_x, top + 4, center_x, bottom - 4, cls=' app-dxp')
			+ badge(center_x + 30, (top + bottom) / 2, step - 1, ' app-dxp'))

	y_role = mids['Role Marketing Team']
	y_card = sy + 72 + 75
	elbow = (box_x + box_w + sx) / 2
	add(7, f'<path class="dg-line app-hub" d="M{box_x + box_w + 4} {y_role} H{elbow} V{y_card} H{sx + 10}" marker-end="url(#an-a-hub)"/>'
		+ badge(elbow, (y_role + y_card) / 2, 6, ' app-hub')
		+ f'<circle class="dg-badge app-hub" cx="{sx + sw - 22}" cy="{sy + 20}" r="10"/>'
		f'<text class="dg-badge-n" x="{sx + sw - 22}" y="{sy + 24}" text-anchor="middle">1</text>')

	nx, ny, nw = sx + 14, sy + 72, sw - 28
	add(7, f'<rect class="dg-card" x="{nx}" y="{ny}" width="{nw}" height="150" rx="8"/>'
		f'<text class="dg-card-ai" x="{nx + 14}" y="{ny + 24}">New LDP insight</text>'
		f'<text class="dg-card-label" x="{nx + 14}" y="{ny + 46}">Unique visitors (Last 7 days)</text>'
		f'<rect class="dg-card-text" x="{nx + 14}" y="{ny + 66}" width="{nw - 28}" height="6" rx="3"/>'
		f'<rect class="dg-card-text" x="{nx + 14}" y="{ny + 80}" width="{nw - 44}" height="6" rx="3"/>'
		f'<rect class="dg-card-text" x="{nx + 14}" y="{ny + 94}" width="{nw - 70}" height="6" rx="3"/>'
		f'<text class="dg-card-saved" x="{nx + nw - 14}" y="{ny + 130}" text-anchor="end">just now</text>')

	defs = '<defs>' + ''.join(
		f'<marker id="an-a-{app}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head app-{app}" d="M0 0 L10 5 L0 10 z"/></marker>'
		for app in ('dxp', 'hub')
	) + '</defs>'

	body = ''.join(f'<g class="an-g" data-s="{step}">{"".join(groups[step])}</g>' for step in sorted(groups))
	svg = (
		'<svg role="img" aria-label="Step-by-step animation of how Notify marketing team reaches the bell." '
		f'viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">{defs}{body}</svg>'
	)
	dots = ''.join(
		f'<button class="walk-dot" type="button" data-step="{i}" aria-label="Step {i}: {e(title)}">{i if i < len(NOTIFY_WALK) else "✓"}</button>'
		for i, (title, _) in enumerate(NOTIFY_WALK, 1)
	)

	return f'''
<section class="diagram walk" data-steps="{len(NOTIFY_WALK)}">
	<h2 class="agenda-title">{heading}</h2>
	<div class="diagram-scroll">{svg}</div>
	<div class="walk-bar">
		<div class="walk-captions" aria-live="polite"></div>
		<div class="walk-controls">
			<button class="walk-btn" data-walk-move="-1" type="button" aria-label="Previous step">&lsaquo;</button>
			<button class="walk-btn" data-walk-move="1" type="button" aria-label="Next step">&rsaquo;</button>
			<div class="walk-dots">{dots}</div>
		</div>
	</div>
</section>'''
