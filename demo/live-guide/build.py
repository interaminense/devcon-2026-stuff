import difflib
import html
import json
import pathlib

DEMO = pathlib.Path.home() / 'dev/projects/devcon-2026/devcon-2026-stuff/demo'
OUT = pathlib.Path(__file__).parent / 'devcon-live-guide.html'

SITE = 'https://webserver-lctacdemodevcon-prd.lfr.cloud'
LOGIN = SITE + '/c/portal/login?redirect=/web/devcon-demo'
DOC_URL = '/documents/d/devcon-demo/ldp-demo-card-js'

PROMPT = '''You are an analytics assistant for Swell Lab, a surf school website. You receive a summary of one Liferay Data Platform metric for the whole site, as shown on a dashboard card: the metric name, the period, the current value, the change against the previous period when available, and the values over time or the breakdown.

Write an insight for a marketing manager in at most three short sentences:
1. What the number says, citing the value and the period.
2. The most notable pattern in the data (a peak, a drop, a trend, or the leading item).
3. One concrete action for the surf school, based only on the data.

Rules: plain text, no markdown, no headings, no lists. Never invent numbers that are not in the summary. Times are in UTC. Rates are ratios between 0 and 1 (0.5 means 50%) and durations are in milliseconds. If the data is empty or too small to conclude anything, say so in one sentence and suggest collecting more traffic first.'''

e = html.escape
COPY = {}


def copy_id(text):
	key = f'c{len(COPY)}'
	COPY[key] = text

	return key


def copy_button(text, label='Copy'):
	return f'<button class="copy" type="button" data-copy="{copy_id(text)}">{label}</button>'


def span(text, cls):
	return f'<span class="{cls}">{e(text)}</span>' if text else ''


def diff_lines(prev, cur):
	"""One HTML string per line of cur: unchanged parts dimmed, new parts lit."""

	cur_lines = cur.split('\n')

	if prev is None:
		return [span(line, 'new') for line in cur_lines]

	prev_lines = prev.split('\n')
	out = []

	matcher = difflib.SequenceMatcher(None, prev_lines, cur_lines, autojunk=False)

	for tag, i1, i2, j1, j2 in matcher.get_opcodes():
		if tag == 'equal':
			out += [span(line, 'old') for line in cur_lines[j1:j2]]
		elif tag == 'insert':
			out += [span(line, 'new') for line in cur_lines[j1:j2]]
		elif tag == 'replace':
			old_block = prev_lines[i1:i2]

			for line in cur_lines[j1:j2]:
				best, ratio = None, 0.0

				for candidate in old_block:
					r = difflib.SequenceMatcher(None, candidate, line).ratio()

					if r > ratio:
						best, ratio = candidate, r

				if best is None or ratio < 0.6:
					out.append(span(line, 'new'))

					continue

				parts = []
				chars = difflib.SequenceMatcher(None, best, line, autojunk=False)

				for ctag, _, _, k1, k2 in chars.get_opcodes():
					parts.append(span(line[k1:k2], 'old' if ctag == 'equal' else 'new'))

				out.append(''.join(parts))

	return out


def code_block(name, prev, cur, note):
	lines = diff_lines(prev, cur)
	rows = ''.join(
		f'<span class="ln">{i}</span><span class="lc">{line or " "}</span>'
		for i, line in enumerate(lines, 1)
	)
	label = 'All new' if prev is None else 'Lit = new since the previous step'

	return f'''
<figure class="code">
	<figcaption>
		<span class="file">{e(name)}</span>
		<span class="legend">{label}</span>
		{copy_button(cur, 'Copy code')}
	</figcaption>
	<div class="code-scroll"><pre>{rows}</pre></div>
	<p class="code-note">{note}</p>
</figure>'''


def values(rows, title=None):
	body = ''.join(
		f'<tr><th scope="row">{field}</th><td><code>{e(value)}</code></td><td>{copy_button(value)}</td></tr>'
		if copyable else
		f'<tr><th scope="row">{field}</th><td colspan="2">{value}</td></tr>'
		for field, value, copyable in rows
	)
	head = f'<caption>{title}</caption>' if title else ''

	return f'<div class="table-scroll"><table class="values">{head}<tbody>{body}</tbody></table></div>'


def v(field, value):
	return (field, value, True)


def plain(field, value):
	return (field, value, False)


class Part:

	def __init__(self, letter, title, topic):
		self.letter, self.title, self.topic = letter, title, topic
		self.items = []

	def step(self, kind, body):
		self.items.append((kind, body))

		return self


KIND = {
	'ui': 'In the UI',
	'code': 'In the editor',
	'say': 'Say',
	'check': 'Expect',
	'warn': 'Heads up',
}


def ship(n):
	return ('ui', f'''<p><strong>Ship version {n}</strong></p>
<ol>
	<li>Save <code>ldp-demo-card.js</code>.</li>
	<li>Documents and Media &rarr; <code>ldp-demo-card.js</code> &rarr; &#8942; &rarr; <b>Edit</b> &rarr; <b>Select File</b> &rarr; pick the file &rarr; <b>Publish</b>.</li>
	<li>Client Extensions &rarr; <b>LDP Demo Card</b> &rarr; set <b>JavaScript URL</b> to the value below &rarr; <b>Publish</b>.</li>
	<li>Demo page &rarr; hard reload (Ctrl + Shift + R).</li>
</ol>
{values([v('JavaScript URL', f'{DOC_URL}?v={n}')])}''')


code = {n: (DEMO / f).read_text().rstrip('\n') for n, f in {
	1: 'step-1-hello.js',
	2: 'step-2-ldp-data.js',
	3: 'step-3-card.js',
	4: 'step-4-objects.js',
	5: 'step-5-ai-hub.js',
}.items()}

parts = []

p = Part('A', 'LDP connected to DXP', 'Topic 04')
p.step('say', 'Before any code: the data lives in LDP, and DXP is already connected to it. The card asks DXP, and DXP asks LDP.')
p.step('ui', '''<ol>
	<li>Tab 2: Control Panel &rarr; Instance Settings &rarr; Platform &rarr; <b>Analytics Cloud</b>. Point at <b>Connected</b>.</li>
	<li><b>Properties</b> tab: show <b>SWELL LAB DevCon 2026</b> and the synced Swell Lab site.</li>
	<li>Tab 1: LDP &rarr; the property. Point at the number in the URL: that is the channel ID.</li>
	<li>Sites dashboard on <b>Last 7 days</b>: the numbers the card will show.</li>
</ol>''' + values([v('Channel ID', '845351493326064678')]))
p.step('say', 'One property is one channel. The channel ID is all the card needs to know whose data to ask for.')
parts.append(p)

p = Part('B', 'The first client extension', 'Topic 04')
p.step('code', code_block('ldp-demo-card.js', None, code[1], 'A Custom Element is a plain web component: a class and a tag name.'))
p.step('ui', '<p><strong>Host it in Documents and Media</strong></p><ol><li>Tab 3: check the site is <b>DEVCON Demo</b> &rarr; Content &amp; Data &rarr; <b>Documents and Media</b>.</li><li><b>New</b> &rarr; <b>File Upload</b> &rarr; pick the file &rarr; <b>Publish</b>.</li></ol>'
	+ values([v('Title', 'ldp-demo-card.js'), plain('URL it gets', f'<code>{DOC_URL}</code>')]))
p.step('ui', '<p><strong>Register the Custom Element</strong></p><ol><li>Tab 4: Applications &rarr; <b>Client Extensions</b> &rarr; <b>New</b> &rarr; <b>Add Custom Element</b>.</li><li>Fill in the fields below &rarr; <b>Publish</b>.</li></ol>'
	+ values([v('Name', 'LDP Demo Card'), v('HTML Element Name', 'ldp-demo-card'), v('JavaScript URL', f'{DOC_URL}?v=1'), plain('Instanceable', '<span class="pill">checked</span>')]))
p.step('say', 'Instanceable lets the same card go on a page twice, each with its own configuration. That is the whole dashboard idea.')
p.step('ui', '<p><strong>Put it on a page</strong></p><ol><li>Tab 5: DEVCON Demo &rarr; Site Builder &rarr; <b>Pages</b> &rarr; <b>New</b>.</li><li><b>Basic Templates</b> &rarr; <b>Blank</b> &rarr; name below &rarr; <b>Add</b>.</li><li><b>Components</b> panel &rarr; <b>Fragments</b> &rarr; Layout Elements &rarr; drag <b>Grid</b>. Set <b>Number of Modules</b> to 2.</li><li><b>Widgets</b> tab &rarr; search the name below &rarr; drag it into the <b>left</b> module &rarr; <b>Publish</b>.</li></ol>'
	+ values([v('Page name', 'Demo'), v('Widget search', 'LDP Demo Card')]))
p.step('check', '&ldquo;Hello, DEVCON 2026!&rdquo; on the page.')
parts.append(p)

p = Part('C', 'Real LDP data', 'Topic 04')
p.step('say', 'The card calls DXP on the same origin, with the user&rsquo;s session and the CSRF token. DXP forwards the GraphQL query to LDP. No LDP token in the browser.')
p.step('code', code_block('ldp-demo-card.js', code[1], code[2], 'Point at <code>CHANNEL_ID</code>, <code>RANGE_KEY = 7</code>, the <code>site</code> query and the <code>x-csrf-token</code> header.'))
p.step(*ship(2))
p.step('check', '&ldquo;Unique visitors: N&rdquo;, the same N as LDP on Last 7 days.')
parts.append(p)

p = Part('D', 'Two instances, one card', 'Topic 04')
p.step('say', 'Now a real card: a metric picker, the value, and the trend against the previous period, which LDP computes for us.')
p.step('code', code_block('ldp-demo-card.js', code[2], code[3], 'Point at <code>METRICS</code> and <code>formatTrend</code>. The config lives only in memory.'))
p.step(*ship(3))
p.step('ui', '<ol><li>Edit the Demo page &rarr; drag a second <b>LDP Demo Card</b> into the <b>right</b> module &rarr; <b>Publish</b>.</li><li>Right card &rarr; select <b>Sessions</b>.</li><li>Reload the page.</li></ol>')
p.step('check', 'After the reload the right card is back to Unique visitors.')
p.step('say', 'The setting was in memory, so it is gone. A dashboard has to remember each card, separately, and we do not want a backend for that.')
parts.append(p)

p = Part('E', 'Persistence with Objects', 'Topic 05')
p.step('ui', '<p><strong>Create the Object</strong></p><ol><li>Control Panel &rarr; Object &rarr; <b>Objects</b> &rarr; folder <b>DEVCON Demo</b> &rarr; <b>Create New Object</b> &rarr; fill in &rarr; <b>Save</b>.</li></ol>'
	+ values([v('Label', 'Demo Card Config'), v('Plural Label', 'Demo Card Configs'), v('Object Name', 'DemoCardConfig')])
	+ '<ol start="2"><li><b>Fields</b> &rarr; <b>Add Field</b> &rarr; fill in &rarr; <b>Save</b>.</li></ol>'
	+ values([v('Label', 'Metric'), v('Field Name', 'metric'), plain('Type', '<span class="pill">Text</span>')])
	+ '<ol start="3"><li><b>Details</b> &rarr; Scope <b>Company</b> &rarr; <b>Publish</b>.</li></ol>')
p.step('say', 'Publishing the Object gives us a REST API for free, at /o/c/democardconfigs. Each entry is keyed by the widget instance id, which DXP already generates.')
p.step('code', code_block('ldp-demo-card.js', code[3], code[4], 'Point at <code>getKey</code>, <code>loadConfig</code> (GET, 404 means never configured) and <code>saveConfig</code> (PUT creates, then replaces).'))
p.step(*ship(4))
p.step('ui', '<ol><li>Right card &rarr; select <b>Sessions</b>.</li><li>Reload the page.</li></ol>')
p.step('check', 'Right card stays on Sessions after the reload.')
p.step('warn', 'A red <code>GET &hellip; 404</code> in DevTools on first load is expected: that card was never configured. After the select changes you see <code>PUT 200</code>.')
parts.append(p)

p = Part('F', 'AI Hub insight', 'Topic 05')
p.step('say', 'An AI Hub agent is an agent definition plus a workflow with an LLM node. The card sends what it shows; AI Hub never reads LDP itself.')
p.step('ui', '<p><strong>Show the agent</strong> (already created)</p><ol><li>Tab 6: AI Hub &rarr; <b>Agent Builder</b> &rarr; <b>DevCon 2026 &middot; Demo LDP Metric Insight</b> &rarr; &#8942; &rarr; <b>View</b>.</li></ol>'
	+ values([v('External reference code', 'DEVCON_2026_DEMO_LDP_METRIC_INSIGHT'), v('Input variables', 'metrics'), v('Output variable', 'insight')]))
p.step('say', 'The external reference code is the agent&rsquo;s address. It is the only thing the card needs to know about it.')
p.step('ui', '<p><strong>Show the workflow</strong></p><ol><li><b>View Workflow</b> &rarr; click the node <code>ldpMetricInsight</code>.</li></ol>'
	+ values([v('User message', 'Metric summary:\n{{metrics}}'), v('Tools', '[]'), v('RAG', '{}'), plain('Prompt', copy_button(PROMPT, 'Copy prompt'))]))
p.step('code', code_block('ldp-demo-card.js', code[4], code[5], 'Point at <code>AGENT_ERC</code>, <code>askAgent</code> (token &rarr; stream &rarr; start the agent &rarr; answer on the event named after it) and <code>describe</code> (plain text lines, never nested JSON).'))
p.step(*ship(5))
p.step('ui', '<ol><li>Right card &rarr; <b>&#10022; AI insight</b>.</li></ol>')
p.step('check', '&ldquo;Asking AI Hub&hellip;&rdquo;, then two or three sentences citing the value, the previous period and one action.')
p.step('say', 'We format the text before sending it: plain labeled lines. Easier for the model, and the firewall in front of AI Hub rejects nested JSON.')
parts.append(p)

TROUBLE = [
	('The page still runs the previous step', 'Bump <code>?v=</code> in the CX and hard reload.'),
	('Widget missing in Widgets', 'Check the CX was published; search <code>LDP Demo Card</code>.'),
	('Card empty, <code>customElements.define</code> error', 'HTML Element Name must be <code>ldp-demo-card</code>.'),
	('Trend shows &ldquo;Previous period: 0&rdquo;', 'No traffic in the 7 days before. Nothing to fix live.'),
	('Config lost after reload in E', 'Object published? Field Name exactly <code>metric</code>?'),
	('<code>AI Hub is not available: &hellip; 404</code>', 'Agent missing or disabled. Check the ERC.'),
	('<code>Failed to fetch</code> on the insight', 'Click again (transient firewall block).'),
	('<code>network error</code> after a long wait', 'The agent never answered: the workflow prompt is empty.'),
]


def render_part(part):
	steps = []

	for index, (kind, body) in enumerate(part.items, 1):
		key = f'{part.letter}{index}'
		steps.append(f'''
<li class="step k-{kind}">
	<label class="done"><input id="done-{key}" type="checkbox" data-key="{key}"><span class="sr">Done</span></label>
	<div class="step-body">
		<span class="kind">{KIND[kind]}</span>
		{body if body.lstrip().startswith('<') else f'<p>{body}</p>'}
	</div>
</li>''')

	return f'''
<section class="part" id="part-{part.letter.lower()}">
	<header class="part-head">
		<span class="letter">{part.letter}</span>
		<div><h2>{part.title}</h2><span class="topic">{part.topic}</span></div>
	</header>
	<ol class="steps">{''.join(steps)}</ol>
</section>'''


nav = ''.join(f'<a href="#part-{p.letter.lower()}"><b>{p.letter}</b> {p.title}</a>' for p in parts)

trouble = ''.join(f'<tr><th scope="row">{a}</th><td>{b}</td></tr>' for a, b in TROUBLE)

page = f'''<title>DEVCON Live Demo Guide</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&amp;family=IBM+Plex+Sans:wght@400;500;600&amp;family=JetBrains+Mono:wght@400;600&amp;display=swap">
<style>
/* Layout: one reading column, a sticky part switcher on top, each part a numbered run of typed steps. */
:root {{
	color-scheme: dark;
	--bg: #0b1020;
	--surface: #121a30;
	--surface-2: #18223d;
	--line: #263252;
	--fg: #e7ecf7;
	--muted: #8c97b3;
	--accent: #5b9dff;
	--accent-soft: rgba(91, 157, 255, 0.14);
	--say: #f2b56b;
	--check: #5fd3a2;
	--warn: #ff8a7a;
	--code-bg: #070b17;
	--code-new: #f4f7ff;
	--code-new-bg: rgba(91, 157, 255, 0.18);
	--code-old: #4a5576;
	--display: 'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif;
	--body: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
	--mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
}}

* {{ box-sizing: border-box; }}

body {{
	background: var(--bg);
	color: var(--fg);
	font: 15px/1.6 var(--body);
	padding-inline: 16px;
}}

.wrap {{ margin: 0 auto; max-width: 880px; padding-block: 32px 96px; }}

a {{ color: var(--accent); }}

code {{ font-family: var(--mono); font-size: 0.88em; background: var(--surface-2); border-radius: 4px; padding: 1px 5px; overflow-wrap: anywhere; }}

.hero {{ display: grid; gap: 12px; padding-block: 8px 24px; }}
.eyebrow {{ color: var(--accent); font: 600 12px/1 var(--mono); letter-spacing: 0.14em; text-transform: uppercase; }}
h1 {{ font: 800 clamp(30px, 6vw, 46px)/1.05 var(--display); letter-spacing: -0.02em; margin: 0; text-wrap: balance; }}
.hero p {{ color: var(--muted); margin: 0; max-width: 62ch; }}

.login {{ align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; display: flex; flex-wrap: wrap; gap: 10px 14px; padding: 14px 16px; }}
.login .label {{ color: var(--muted); font: 600 11px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; }}
.login code {{ background: none; flex: 1 1 280px; min-width: 0; padding: 0; }}

.bar {{ align-items: center; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); display: flex; gap: 6px; margin-inline: -16px; overflow-x: auto; padding: 10px 16px; position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; }}
.bar a {{ border: 1px solid var(--line); border-radius: 999px; color: var(--muted); flex: none; font-size: 13px; padding: 5px 12px; text-decoration: none; }}
.bar a b {{ color: var(--accent); font-family: var(--mono); margin-right: 4px; }}
.bar a:hover, .bar a:focus-visible {{ border-color: var(--accent); color: var(--fg); }}
.bar .spacer {{ flex: 1; }}
.toggle {{ align-items: center; color: var(--muted); display: flex; flex: none; font-size: 13px; gap: 6px; }}

.part {{ padding-top: 40px; scroll-margin-top: 56px; }}
.part-head {{ align-items: center; display: flex; gap: 14px; margin-bottom: 18px; }}
.letter {{ align-items: center; background: var(--accent-soft); border: 1px solid var(--accent); border-radius: 10px; color: var(--accent); display: flex; flex: none; font: 800 22px/1 var(--display); height: 44px; justify-content: center; width: 44px; }}
h2 {{ font: 700 24px/1.15 var(--display); margin: 0; text-wrap: balance; }}
.topic {{ color: var(--muted); font: 500 12px/1 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; }}

.steps {{ display: grid; gap: 10px; list-style: none; margin: 0; padding: 0; }}
.step {{ background: var(--surface); border: 1px solid var(--line); border-radius: 12px; display: grid; gap: 12px; grid-template-columns: auto minmax(0, 1fr); padding: 14px 16px; }}
.step.is-done {{ opacity: 0.45; }}
.step-body {{ display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr); min-width: 0; }}
.step-body > * {{ max-width: 100%; min-width: 0; }}
.step-body p {{ margin: 0; }}
.step-body ol {{ display: grid; gap: 4px; margin: 0; padding-left: 20px; }}
.kind {{ font: 600 11px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; }}
.k-ui .kind {{ color: var(--accent); }}
.k-code .kind {{ color: var(--fg); }}
.k-say {{ background: transparent; border-style: dashed; border-color: color-mix(in srgb, var(--say) 45%, transparent); }}
.k-say .kind {{ color: var(--say); }}
.k-say p {{ font-size: 17px; font-style: italic; line-height: 1.5; }}
.k-check {{ border-color: color-mix(in srgb, var(--check) 40%, transparent); }}
.k-check .kind {{ color: var(--check); }}
.k-warn {{ border-color: color-mix(in srgb, var(--warn) 40%, transparent); }}
.k-warn .kind {{ color: var(--warn); }}

.done {{ cursor: pointer; padding-top: 1px; }}
.done input {{ accent-color: var(--check); cursor: pointer; height: 18px; width: 18px; }}
.sr {{ clip: rect(0 0 0 0); height: 1px; overflow: hidden; position: absolute; width: 1px; }}

.table-scroll {{ overflow-x: auto; }}
.values {{ border-collapse: collapse; width: 100%; }}
.values th, .values td {{ border-top: 1px solid var(--line); padding: 8px 10px 8px 0; text-align: left; vertical-align: middle; }}
.values tr:first-child th, .values tr:first-child td {{ border-top: 0; }}
.values th {{ color: var(--muted); font-weight: 500; white-space: nowrap; width: 1%; }}
.values td:last-child {{ text-align: right; width: 1%; }}
.values td code {{ white-space: pre-wrap; }}
.pill {{ background: var(--accent-soft); border-radius: 999px; color: var(--accent); font-size: 13px; padding: 2px 10px; }}

.copy {{ background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; color: var(--fg); cursor: pointer; font: 500 12px/1 var(--body); padding: 7px 10px; white-space: nowrap; }}
.copy:hover, .copy:focus-visible {{ border-color: var(--accent); outline: none; }}
.copy.ok {{ border-color: var(--check); color: var(--check); }}

.code {{ margin: 0; min-width: 0; }}
.code figcaption {{ align-items: center; display: flex; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 8px; }}
.file {{ font: 600 13px/1 var(--mono); }}
.legend {{ color: var(--muted); flex: 1; font-size: 12px; }}
.code-scroll {{ background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px; max-height: 70vh; overflow: auto; }}
.code pre {{ display: grid; font: 13px/1.55 var(--mono); grid-template-columns: auto 1fr; margin: 0; padding: 12px 0; tab-size: 4; }}
.ln {{ color: var(--code-old); padding: 0 12px 0 14px; text-align: right; user-select: none; }}
.lc {{ padding-right: 16px; white-space: pre; }}
.old {{ color: var(--code-old); }}
.new {{ background: var(--code-new-bg); border-radius: 3px; color: var(--code-new); }}
body.flat .old {{ color: #b9c3dc; }}
body.flat .new {{ background: none; }}
.code-note {{ color: var(--muted); font-size: 14px; margin: 8px 0 0; }}

.trouble {{ padding-top: 48px; }}
.trouble table {{ border-collapse: collapse; width: 100%; }}
.trouble th, .trouble td {{ border-top: 1px solid var(--line); padding: 10px 12px 10px 0; text-align: left; vertical-align: top; }}
.trouble th {{ font-weight: 500; width: 45%; }}
.trouble td {{ color: var(--muted); }}

.foot {{ align-items: center; color: var(--muted); display: flex; flex-wrap: wrap; font-size: 13px; gap: 12px; justify-content: space-between; padding-top: 32px; }}
.reset {{ background: none; border: 1px solid var(--line); border-radius: 8px; color: var(--muted); cursor: pointer; font: inherit; padding: 6px 12px; }}

:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px; }}

@media (max-width: 560px) {{
	.values th {{ white-space: normal; }}
	.trouble th {{ width: auto; }}
}}

@media (prefers-reduced-motion: reduce) {{
	* {{ scroll-behavior: auto !important; transition: none !important; }}
}}
html {{ scroll-behavior: smooth; }}
</style>

<div class="wrap">
	<header class="hero">
		<span class="eyebrow">DEVCON 2026 &middot; Live demo</span>
		<h1>One LDP metric card, from an empty site to an AI insight</h1>
		<p>Follow the parts in order. Lit code is what changed since the previous step; dimmed code was already there.</p>
		<div class="login">
			<span class="label">Log in</span>
			<code>{e(LOGIN)}</code>
			{copy_button(LOGIN)}
		</div>
		<label class="toggle"><input id="flat" type="checkbox"> Show code without the change highlight</label>
	</header>

	<nav class="bar" aria-label="Parts">
		{nav}
	</nav>

	{''.join(render_part(p) for p in parts)}

	<section class="trouble" id="trouble">
		<header class="part-head"><span class="letter">?</span><div><h2>If something breaks</h2><span class="topic">Quick fixes</span></div></header>
		<div class="table-scroll"><table><tbody>{trouble}</tbody></table></div>
	</section>

	<footer class="foot">
		<span>Code from <code>interaminense/devcon-2026-stuff</code>, folder <code>demo/</code>.</span>
		<button class="reset" id="reset" type="button">Clear all checkmarks</button>
	</footer>
</div>

<script id="copy-data" type="application/json">{json.dumps(COPY).replace("</", "<\\/")}</script>
<script>
(() => {{
	const texts = JSON.parse(document.getElementById('copy-data').textContent);
	const store = {{
		get(key) {{ try {{ return localStorage.getItem(key); }} catch {{ return null; }} }},
		set(key, value) {{ try {{ value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); }} catch {{}} }},
	}};

	document.addEventListener('click', async (event) => {{
		const button = event.target.closest('.copy');

		if (!button) {{
			return;
		}}

		const text = texts[button.dataset.copy];
		const label = button.textContent;

		try {{
			await navigator.clipboard.writeText(text);
			button.textContent = 'Copied';
		}}
		catch {{
			const area = document.createElement('textarea');

			area.value = text;
			document.body.appendChild(area);
			area.select();
			const ok = document.execCommand && document.execCommand('copy');
			area.remove();
			button.textContent = ok ? 'Copied' : 'Select and copy';
		}}

		button.classList.add('ok');

		setTimeout(() => {{
			button.textContent = label;
			button.classList.remove('ok');
		}}, 1400);
	}});

	const boxes = [...document.querySelectorAll('.done input')];

	const paint = (box) => box.closest('.step').classList.toggle('is-done', box.checked);

	for (const box of boxes) {{
		box.checked = store.get('done-' + box.dataset.key) === '1';
		paint(box);

		box.addEventListener('change', () => {{
			store.set('done-' + box.dataset.key, box.checked ? '1' : null);
			paint(box);
		}});
	}}

	document.getElementById('reset').addEventListener('click', () => {{
		for (const box of boxes) {{
			box.checked = false;
			store.set('done-' + box.dataset.key, null);
			paint(box);
		}}
	}});

	const flat = document.getElementById('flat');

	flat.checked = store.get('flat') === '1';
	document.body.classList.toggle('flat', flat.checked);

	flat.addEventListener('change', () => {{
		document.body.classList.toggle('flat', flat.checked);
		store.set('flat', flat.checked ? '1' : null);
	}});
}})();
</script>
'''

OUT.write_text(page)
print(OUT, len(page))
