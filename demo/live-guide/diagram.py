"""How the demo card works: the applications as boxes, the calls as numbered arrows."""

import html

e = html.escape

W, H = 1100, 620

BROWSER = (30, 40, 220, 462)
DXP = (350, 16, 370, 506)
SUB_X, SUB_W, SUB_H = 375, 320, 62
SUBS = [
	('Client Extensions', 'Custom Element · ldp-demo-card', 60),
	('Documents and Media', '/documents/d/devcon-demo/…', 142),
	('Analytics proxy', '/o/analytics-rest/v1.0/graphql', 224),
	('Objects API', '/o/c/democardconfigs', 306),
	('AI Hub connection', '/o/ai-hub-cell/v1.0/…tokens', 400),
]
RIGHT_X, RIGHT_W = 840, 230
RIGHT = [
	('LDP', 'GraphQL · property channel', 224, ' app-ldp'),
	('LLM', 'runs the prompt', 300, ' app-hub dg-soft'),
	('AI Hub', 'na1.hub.liferay.com · agent', 400, ' app-hub'),
]

APP = {'0': 'dxp', '1': 'dxp', '2': 'dxp', '3': 'ldp', '4': 'dxp', '5': 'hub', '6': 'hub'}

STEPS = [
	('0', 'Setup', 'part 2', ['Documents and Media → File Upload', 'Client Extensions → Custom Element'], 'You upload ldp-demo-card.js and register it with its URL, ?v=N and Instanceable. Each upload needs a new ?v=N.'),
	('1', 'Page', 'part 2', ['GET /web/devcon-demo/demo'], 'DXP renders the page with <ldp-demo-card> and a <script> pointing at the registered JavaScript URL.'),
	('2', 'Script', 'part 2', ['GET /documents/d/devcon-demo/ldp-demo-card-js?v=N'], 'Documents and Media serves the file as JavaScript; customElements.define starts every instance.'),
	('3', 'Metric', 'parts 3–4', ['POST /o/analytics-rest/v1.0/graphql'], 'Same origin: the session and x-csrf-token are the auth. DXP forwards site(channelId, rangeKey: 7) to LDP with the workspace token and returns value, previousValue and trend.'),
	('4', 'Config', 'part 5', ['GET …/democardconfigs/by-external-reference-code/{id}', 'PUT same URL { metric }'], 'One entry per widget instance, keyed by its portlet id. 404 means never configured; PUT creates, then replaces.'),
	('5', 'Token', 'part 6', ['POST /o/ai-hub-cell/v1.0/authorization-tokens'], 'DXP uses the Client ID and Secret on the server and hands the card accessToken, userToken and serviceURL.'),
	('6', 'Insight', 'part 6', ['GET {serviceURL}/o/ai-hub/v1.0/agent-instances/subscribe', 'POST {serviceURL}/o/ai-hub/v1.0/agent-instances'], 'The card talks to AI Hub directly (cross-origin, allowed by the Environment URL): it opens an event stream, starts the agent with { metrics }, and the insight comes back as the event DEVCON_2026_DEMO_LDP_METRIC_INSIGHT.'),
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


def arrow(x1, y1, x2, y2, both=False, cls=''):
	marker = next((f'dg-a-{app}' for app in ('dxp', 'ldp', 'hub') if f'app-{app}' in cls), 'dg-a')
	start = f' marker-start="url(#{marker})"' if both else ''

	return f'<line class="dg-line{cls}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"{start} marker-end="url(#{marker})"/>'


def render():
	bx, by, bw, bh = BROWSER
	dx, dy, dw, dh = DXP
	parts = []

	parts.append(f'<rect class="dg-group app-dxp" x="{dx}" y="{dy}" width="{dw}" height="{dh}" rx="14"/>')
	parts.append(f'<text class="dg-group-name app-dxp" x="{dx + 25}" y="{dy + 30}">DXP</text>')
	parts.append(f'<text class="dg-path" x="{dx + 72}" y="{dy + 30}">same origin as the page</text>')

	parts.append(f'<rect class="dg-box dg-browser" x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="12"/>')
	parts.append(f'<text class="dg-name" x="{bx + 18}" y="{by + 30}">Browser</text>')
	parts.append(f'<text class="dg-path" x="{bx + 18}" y="{by + 52}">&lt;ldp-demo-card&gt; × 2</text>')
	parts.append(f'<text class="dg-path" x="{bx + 18}" y="{by + 72}">one per widget instance</text>')

	for title, sub, y in SUBS:
		parts.append(box(SUB_X, y, SUB_W, SUB_H, title, sub, ' app-dxp'))

	for title, sub, y, cls in RIGHT:
		parts.append(box(RIGHT_X, y, RIGHT_W, SUB_H, title, sub, cls))

	mid = {title: y + SUB_H / 2 for title, _, y in SUBS}
	left, right_edge = bx + bw, SUB_X
	sub_end = SUB_X + SUB_W
	a_mid = (left + right_edge) / 2
	r_mid = (sub_end + RIGHT_X) / 2

	parts.append(arrow(right_edge - 4, mid['Client Extensions'], left + 4, mid['Client Extensions'], cls=' app-dxp'))
	parts.append(badge(a_mid, mid['Client Extensions'], 1, ' app-dxp'))
	parts.append(arrow(right_edge - 4, mid['Documents and Media'], left + 4, mid['Documents and Media'], cls=' app-dxp'))
	parts.append(badge(a_mid, mid['Documents and Media'], 2, ' app-dxp'))

	y3 = mid['Analytics proxy']
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
	hub_bottom = 400 + SUB_H
	route_y = 568
	browser_x = bx + bw / 2
	parts.append(
		f'<path class="dg-line app-hub" d="M{browser_x} {by + bh + 4} V{route_y} H{hub_x} V{hub_bottom + 4}" '
		f'marker-start="url(#dg-a-hub)" marker-end="url(#dg-a-hub)"/>'
	)
	parts.append(badge((browser_x + hub_x) / 2, route_y, 6, ' app-hub'))
	parts.append(f'<text class="dg-route app-hub" x="{(browser_x + hub_x) / 2}" y="{route_y + 32}" text-anchor="middle">browser ⇄ AI Hub, cross-origin</text>')

	parts.append(arrow(hub_x, 400 - 4, hub_x, 300 + SUB_H + 4, both=True, cls=' app-hub'))
	parts.append(badge(hub_x + 28, (400 + 300 + SUB_H) / 2, 6, ' app-hub'))

	defs = '''<defs>
	<marker id="dg-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head" d="M0 0 L10 5 L0 10 z"/></marker>
	<marker id="dg-a-dxp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head app-dxp" d="M0 0 L10 5 L0 10 z"/></marker>
	<marker id="dg-a-ldp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head app-ldp" d="M0 0 L10 5 L0 10 z"/></marker>
	<marker id="dg-a-hub" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-head app-hub" d="M0 0 L10 5 L0 10 z"/></marker>
</defs>'''

	svg = (
		'<svg role="img" aria-label="The demo card in the browser loads from Documents and Media, reads LDP through the DXP analytics proxy, stores its configuration in the Objects API, gets an AI Hub token from DXP, and then talks to AI Hub directly, which runs the LLM." '
		f'viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">{defs}{"".join(parts)}</svg>'
	)

	steps = ''.join(
		f'''<li class="flow-step app-{APP[n]}{" flow-wide" if n == "6" else ""}">
	<span class="flow-n">{n}</span>
	<div class="flow-body">
		<p class="flow-title"><b>{e(title)}</b> <span>{e(part)}</span></p>
		<p class="flow-calls">{"".join(f"<code>{e(call)}</code>" for call in calls)}</p>
		<p class="flow-text">{e(text)}</p>
	</div>
</li>'''
		for n, title, part, calls, text in STEPS
	)

	return f'''
<section class="diagram" id="diagram">
	<h2 class="agenda-title">How the card works</h2>
	<div class="diagram-scroll">{svg}</div>
	<p class="dg-legend"><span class="app-dxp">DXP</span><span class="app-ldp">LDP</span><span class="app-hub">AI Hub</span><span class="dg-legend-note">Each call takes the color of the application that answers it.</span></p>
	<ol class="flow">{steps}</ol>
</section>'''
