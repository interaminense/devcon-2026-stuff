"""The request flow of the demo card, as an inline SVG sequence diagram."""

import html

e = html.escape

LANES = [
	('browser', 'Browser', 'the card in the page', 110),
	('dxp', 'DXP', 'D&M · CX · Objects · proxies', 400),
	('ldp', 'LDP', 'Liferay Data Platform', 650),
	('hub', 'AI Hub', 'agents and workflows', 860),
	('llm', 'LLM', 'the model', 1070),
]
X = {key: x for key, _, _, x in LANES}
W = 1170

# (kind, ...) rows: ('phase', title) or ('msg', from, to, label, style)
# style: req, res, cors (cross-origin request), cors-res
ROWS = [
	('phase', 'Setup · you, as admin, host and register the card · part 2'),
	('msg', 'browser', 'dxp', 'Documents and Media: File Upload ldp-demo-card.js → /documents/d/devcon-demo/ldp-demo-card-js', 'req'),
	('msg', 'browser', 'dxp', 'Client Extensions: Custom Element · tag ldp-demo-card · JavaScript URL …?v=N · Instanceable', 'req'),
	('phase', 'Page load'),
	('msg', 'browser', 'dxp', 'GET /web/devcon-demo/demo', 'req'),
	('msg', 'dxp', 'browser', 'HTML with <ldp-demo-card> + <script src="…ldp-demo-card-js?v=N">', 'res'),
	('msg', 'browser', 'dxp', 'GET /documents/d/devcon-demo/ldp-demo-card-js?v=N', 'req'),
	('msg', 'dxp', 'browser', 'application/javascript → customElements.define runs the card', 'res'),
	('phase', 'The metric · parts 3 and 4'),
	('msg', 'browser', 'dxp', 'POST /o/analytics-rest/v1.0/graphql · session + x-csrf-token · site(channelId, rangeKey: 7)', 'req'),
	('msg', 'dxp', 'ldp', 'same GraphQL, with the workspace token', 'req'),
	('msg', 'ldp', 'dxp', 'value · previousValue · trend', 'res'),
	('msg', 'dxp', 'browser', 'JSON → the card renders the number and the trend', 'res'),
	('phase', 'The configuration · part 5'),
	('msg', 'browser', 'dxp', 'GET /o/c/democardconfigs/by-external-reference-code/{instance id}', 'req'),
	('msg', 'dxp', 'browser', '200 { metric } · or 404 → default metric', 'res'),
	('msg', 'browser', 'dxp', 'PUT same URL { metric } when the select changes · creates, then replaces', 'req'),
	('phase', 'The AI insight · part 6 · ✦ AI insight button'),
	('msg', 'browser', 'dxp', 'POST /o/ai-hub-cell/v1.0/authorization-tokens', 'req'),
	('msg', 'dxp', 'hub', 'Client ID + Client Secret (server side)', 'req'),
	('msg', 'hub', 'dxp', 'tokens', 'res'),
	('msg', 'dxp', 'browser', 'accessToken · userToken · serviceURL', 'res'),
	('msg', 'browser', 'hub', 'GET {serviceURL}/o/ai-hub/v1.0/agent-instances/subscribe · Bearer · event stream', 'cors'),
	('msg', 'hub', 'browser', 'event: Subscribe · data: stream key', 'cors-res'),
	('msg', 'browser', 'hub', 'POST /o/ai-hub/v1.0/agent-instances · { ERC, context: { metrics }, sseEventSinkKey } · On-Behalf-Of', 'cors'),
	('msg', 'hub', 'llm', 'llm node: prompt + {{metrics}}', 'req'),
	('msg', 'llm', 'hub', 'insight text', 'res'),
	('msg', 'hub', 'browser', 'event: DEVCON_2026_DEMO_LDP_METRIC_INSIGHT · { nodeName, data } → shown in the card', 'cors-res'),
]

TOP = 92
ROW = 34
PHASE = 40


def render():
	out = []
	y = TOP
	marks = []

	for row in ROWS:
		if row[0] == 'phase':
			y += 10
			marks.append(f'<line class="dg-phase-line" x1="16" x2="{W - 16}" y1="{y}" y2="{y}"/>')
			marks.append(f'<text class="dg-phase" x="16" y="{y + 18}">{e(row[1])}</text>')
			y += PHASE - 10

			continue

		_, a, b, label, style = row
		x1, x2 = X[a], X[b]
		right = x2 > x1
		y += ROW
		gap = 6
		start = x1 + (gap if right else -gap)
		end = x2 - (10 if right else -10)
		cls = {'req': 'dg-req', 'res': 'dg-res', 'cors': 'dg-req dg-cors', 'cors-res': 'dg-res dg-cors'}[style]
		marker = 'dg-head-cors' if 'cors' in style else 'dg-head'
		marks.append(f'<line class="{cls}" x1="{start}" x2="{end}" y1="{y}" y2="{y}" marker-end="url(#{marker})"/>')
		tx = min(start, end) + (8 if right else 14)
		marks.append(f'<text class="dg-label" x="{tx}" y="{y - 7}">{e(label)}</text>')

	height = y + 30

	lanes = []

	for key, name, sub, x in LANES:
		lanes.append(f'<line class="dg-lane" x1="{x}" x2="{x}" y1="{TOP - 24}" y2="{height - 10}"/>')
		lanes.append(f'<rect class="dg-box{" dg-box-hub" if key == "hub" else ""}" x="{x - 78}" y="14" width="156" height="52" rx="10"/>')
		lanes.append(f'<text class="dg-name" x="{x}" y="36" text-anchor="middle">{e(name)}</text>')
		lanes.append(f'<text class="dg-sub" x="{x}" y="54" text-anchor="middle">{e(sub)}</text>')

	defs = '''<defs>
	<marker id="dg-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-arrow" d="M0 0 L10 5 L0 10 z"/></marker>
	<marker id="dg-head-cors" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-arrow-cors" d="M0 0 L10 5 L0 10 z"/></marker>
</defs>'''

	svg = (
		f'<svg role="img" aria-label="How the demo card works: the browser loads the card from Documents and Media, reads the metric through the DXP proxy to LDP, keeps its configuration in a Liferay Object, gets an AI Hub token from DXP, then talks to AI Hub directly over an event stream to get the insight." '
		f'viewBox="0 0 {W} {height}" xmlns="http://www.w3.org/2000/svg">{defs}{"".join(lanes)}{"".join(marks)}</svg>'
	)

	return f'''
<figure class="diagram" id="diagram">
	<div class="diagram-scroll">{svg}</div>
	<figcaption>
		<span><i class="sw sw-req"></i>request</span>
		<span><i class="sw sw-res"></i>response</span>
		<span><i class="sw sw-cors"></i>browser straight to AI Hub, cross-origin (allowed by the Environment URL)</span>
		<span class="cap-note">Everything else is same-origin with DXP, so the session and the CSRF token do the auth. Secrets never leave the DXP server.</span>
	</figcaption>
</figure>'''
