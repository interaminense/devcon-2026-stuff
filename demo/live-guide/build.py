import difflib
import html
import json
import pathlib
import re

DEMO = pathlib.Path.home() / 'dev/projects/devcon-2026/devcon-2026-stuff/demo'
OUT = pathlib.Path(__file__).parent / 'devcon-live-guide.html'

SITE = 'https://webserver-lctacdemodevcon-prd.lfr.cloud'
LOGIN = SITE + '/web/devcon-demo/home?p_p_id=com_liferay_login_web_portlet_LoginPortlet&p_p_state=maximized&_com_liferay_login_web_portlet_LoginPortlet_redirect=%2Fweb%2Fdevcon-demo'
DOC_URL = '/documents/d/devcon-demo/ldp-demo-card-js'

PROMPT = '''You are an analytics assistant. You receive one website metric from Liferay Data Platform: its name, the period, the value, the previous period's value, and the change.

Write at most three short sentences for a marketing manager: what the number says, how it compares with the previous period, and one concrete action. Plain text only. Never invent numbers. If there is too little data, say so in one sentence.'''

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


KEYWORDS = {
	'async', 'await', 'break', 'catch', 'class', 'const', 'continue', 'else',
	'extends', 'false', 'for', 'function', 'if', 'in', 'let', 'new', 'null',
	'of', 'return', 'this', 'throw', 'true', 'try', 'typeof', 'undefined',
	'var', 'while',
}


def syntax_classes(text):
	"""One syntax class per character of a JavaScript source."""

	classes = ['tx'] * len(text)
	i = 0
	n = len(text)

	def mark(start, end, cls):
		for k in range(start, end):
			classes[k] = cls

	def template(i):
		start = i
		i += 1

		while i < n and text[i] != '`':
			if text[i] == '\\':
				i += 2

				continue

			if text[i:i + 2] == '${':
				mark(start, i, 'st')
				depth = 1
				j = i + 2

				while j < n and depth:
					depth += {'{': 1, '}': -1}.get(text[j], 0)
					j += 1

				mark(i, i + 2, 'pu')
				inner(i + 2, j - 1)
				mark(j - 1, j, 'pu')
				i = j
				start = i

				continue

			i += 1

		mark(start, i + 1, 'st')

		return i + 1

	def inner(start, end):
		sub = syntax_classes(text[start:end])

		for k, cls in enumerate(sub):
			classes[start + k] = cls

	while i < n:
		c = text[i]

		if text.startswith('//', i):
			j = text.find('\n', i)
			j = n if j < 0 else j
			mark(i, j, 'cm')
			i = j
		elif text.startswith('/*', i):
			j = text.find('*/', i + 2)
			j = n if j < 0 else j + 2
			mark(i, j, 'cm')
			i = j
		elif c == '`':
			i = template(i)
		elif c in '\'"':
			j = i + 1

			while j < n and text[j] != c:
				j += 2 if text[j] == '\\' else 1

			mark(i, j + 1, 'st')
			i = j + 1
		elif c.isdigit() and (i == 0 or not (text[i - 1].isalnum() or text[i - 1] == '_')):
			m = re.match(r'\d+(\.\d+)?', text[i:])
			mark(i, i + m.end(), 'nu')
			i += m.end()
		elif c.isalpha() or c in '_$':
			m = re.match(r'[\w$]+', text[i:])
			word = m.group(0)
			after = text[i + m.end():].lstrip(' ')

			if word in KEYWORDS:
				mark(i, i + m.end(), 'kw')
			elif after.startswith('('):
				mark(i, i + m.end(), 'fn')
			elif word[0].isupper():
				mark(i, i + m.end(), 'ty')

			i += m.end()
		else:
			i += 1

	return classes


def diff_marks(prev, cur):
	"""For each line of cur, one boolean per character: True when new."""

	cur_lines = cur.split('\n')

	if prev is None:
		return [[True] * len(line) for line in cur_lines]

	prev_lines = prev.split('\n')
	out = []

	matcher = difflib.SequenceMatcher(None, prev_lines, cur_lines, autojunk=False)

	for tag, i1, i2, j1, j2 in matcher.get_opcodes():
		if tag == 'equal':
			out += [[False] * len(line) for line in cur_lines[j1:j2]]
		elif tag == 'insert':
			out += [[True] * len(line) for line in cur_lines[j1:j2]]
		elif tag == 'replace':
			old_block = prev_lines[i1:i2]

			for line in cur_lines[j1:j2]:
				best, ratio = None, 0.0

				for candidate in old_block:
					r = difflib.SequenceMatcher(None, candidate, line).ratio()

					if r > ratio:
						best, ratio = candidate, r

				if best is None or ratio < 0.6:
					out.append([True] * len(line))

					continue

				flags = [True] * len(line)
				chars = difflib.SequenceMatcher(None, best, line, autojunk=False)

				for ctag, _, _, k1, k2 in chars.get_opcodes():
					if ctag == 'equal':
						for k in range(k1, k2):
							flags[k] = False

				out.append(flags)

	return out


def render_lines(prev, cur):
	marks = diff_marks(prev, cur)
	classes = syntax_classes(cur)
	lines = []
	offset = 0

	for line, flags in zip(cur.split('\n'), marks):
		runs = []

		for k, ch in enumerate(line):
			cls = classes[offset + k] if flags[k] else 'old'

			if runs and runs[-1][0] == cls:
				runs[-1][1] += ch
			else:
				runs.append([cls, ch])

		lines.append(''.join(f'<span class="{cls}">{e(text)}</span>' for cls, text in runs))
		offset += len(line) + 1

	return lines


def code_block(name, prev, cur, note=''):
	rows = ''.join(
		f'<span class="ln">{i}</span><span class="lc">{line or " "}</span>'
		for i, line in enumerate(render_lines(prev, cur), 1)
	)
	label = 'All new' if prev is None else 'Bright = new since the previous step'
	note_html = f'<p class="code-note">{note}</p>' if note else ''

	return f'''
<figure class="code">
	<figcaption>
		<span class="file">{e(name)}</span>
		<span class="legend">{label}</span>
		{copy_button(cur, 'Copy code')}
	</figcaption>
	<div class="code-scroll"><pre>{rows}</pre></div>
	{note_html}
</figure>'''


def values(rows, title=None):
	described = any(len(row) > 3 for row in rows)
	body = []

	for row in rows:
		field, value, copyable = row[:3]
		purpose = f'<td class="purpose">{row[3]}</td>' if described else ''

		if copyable:
			body.append(f'<tr><th scope="row">{field}</th><td><code>{e(value)}</code></td>{purpose}<td>{copy_button(value)}</td></tr>')
		else:
			body.append(f'<tr><th scope="row">{field}</th><td>{value}</td>{purpose}<td></td></tr>')

	head = f'<caption>{title}</caption>' if title else ''
	cols = '<thead><tr><th scope="col">Field</th><th scope="col">Value</th><th scope="col">What it does</th><th></th></tr></thead>' if described else ''
	cls = 'values described' if described else 'values'

	return f'<div class="table-scroll"><table class="{cls}">{head}{cols}<tbody>{''.join(body)}</tbody></table></div>'


def v(field, value, purpose=None):
	return (field, value, True) if purpose is None else (field, value, True, purpose)


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

p = Part('1', 'LDP connected to DXP', 'Topic 04')
p.step('say', 'Before any code: the data lives in LDP, and DXP is already connected to it. The card asks DXP, and DXP asks LDP.')
p.step('ui', '''<ol>
	<li>Tab 2: Control Panel &rarr; Instance Settings &rarr; Platform &rarr; <b>Analytics Cloud</b>. Point at <b>Connected</b>.</li>
	<li><b>Properties</b> tab: show <b>SWELL LAB DevCon 2026</b> and the synced Swell Lab site.</li>
</ol>''')
parts.append(p)

p = Part('2', 'The first client extension', 'Topic 04')
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

p = Part('3', 'Real LDP data', 'Topic 04')
p.step('say', 'The card calls DXP on the same origin, with the user&rsquo;s session and the CSRF token. DXP forwards the GraphQL query to LDP. No LDP token in the browser.')
p.step('ui', '<p><strong>Get the channel ID from LDP</strong></p><ol><li>Tab 1: open <code>ldp-internal.liferay.com</code> &rarr; workspace <b>Liferay Data Platform</b> &rarr; property <b>SWELL LAB DevCon 2026</b> &rarr; <b>Sites</b>.</li><li>The channel ID is the number in the URL, between the workspace and <code>/sites</code>. Copy it.</li><li>Leave the Sites dashboard on <b>Last 7 days</b>: the card must show the same numbers.</li></ol>'
	+ values([v('LDP Sites URL', 'https://ldp-internal.liferay.com/workspace/liferay-data-platform/845351493326064678/sites'), v('Channel ID', '845351493326064678')]))
p.step('say', 'One property is one channel. The channel ID is all the card needs to know whose data to ask for.')
p.step('code', code_block('ldp-demo-card.js', code[1], code[2], 'Point at <code>CHANNEL_ID</code>, <code>RANGE_KEY = 7</code>, the <code>site</code> query and the <code>x-csrf-token</code> header.'))
p.step(*ship(2))
p.step('check', '&ldquo;Unique visitors: N&rdquo;, the same N as LDP on Last 7 days.')
parts.append(p)

p = Part('4', 'Two instances, one card', 'Topic 04')
p.step('say', 'Now a real card: a metric picker, the value, and the trend against the previous period, which LDP computes for us.')
p.step('code', code_block('ldp-demo-card.js', code[2], code[3], 'Point at <code>METRICS</code> and <code>formatTrend</code>. The config lives only in memory.'))
p.step(*ship(3))
p.step('ui', '<ol><li>Edit the Demo page &rarr; drag a second <b>LDP Demo Card</b> into the <b>right</b> module &rarr; <b>Publish</b>.</li><li>Right card &rarr; select <b>Sessions</b>.</li><li>Reload the page.</li></ol>')
p.step('check', 'After the reload the right card is back to Unique visitors.')
p.step('say', 'The setting was in memory, so it is gone. A dashboard has to remember each card, separately, and we do not want a backend for that.')
parts.append(p)

p = Part('5', 'Persistence with Objects', 'Topic 05')
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

p = Part('6', 'AI Hub insight', 'Topic 05')
p.step('say', 'An AI Hub agent is an agent definition plus a workflow with an LLM node. The card sends what it shows; AI Hub never reads LDP itself.')
p.step('ui', '<p><strong>Create the agent</strong></p><ol><li>Tab 6: AI Hub &rarr; <b>Agent Builder</b>.</li><li><b>Make Shorter</b> &rarr; &#8942; &rarr; <b>Duplicate</b>.</li><li>On the copy: &#8942; &rarr; <b>View</b> &rarr; fill in the fields below &rarr; <b>Save</b>.</li></ol>'
	+ values([v('Title', 'DevCon 2026 Demo LDP Metric Insight', 'The name people see in Agent Builder.'), v('Description', 'Turns one LDP metric from the DEVCON demo card into a short insight.', 'Tells people, and the AI Hub assistant that picks agents, what this agent is for.'), v('External reference code', 'DEVCON_2026_DEMO_LDP_METRIC_INSIGHT', 'The agent&rsquo;s fixed address. The card starts the agent with it, and the answer comes back on an event with this name.'), v('Input variables', 'metrics', 'The names of the values the caller sends. The card sends its summary as <code>metrics</code>.'), v('Output variable', 'insight', 'Which workflow output is the agent&rsquo;s answer. Must match the node&rsquo;s output variable.')]))
p.step('say', 'The external reference code is the agent&rsquo;s address. It is the only thing the card needs to know about it.')
p.step('ui', '<p><strong>Write its workflow</strong></p><ol><li><b>View Workflow</b> &rarr; click the LLM node in the middle.</li><li>In the panel on the right, fill in the fields below &rarr; <b>Update</b>.</li></ol>'
	+ values([v('Node Name', 'ldpMetricInsight', 'The node&rsquo;s id inside the workflow. It also comes back in the answer as <code>nodeName</code>.'), v('Input variables', '[{"name":"metrics","type":"string"}]', 'The values this node reads. Only these are replaced as <code>{{name}}</code> in the prompt and the user message.'), v('Output variables', '[{"name":"insight","type":"string"}]', 'Where the node stores the model&rsquo;s reply.'), v('Prompt', PROMPT, 'The system message: the model&rsquo;s role, the rules, and the shape of the answer.'), v('User message', 'Metric summary:\n{{metrics}}', 'The message the model answers. <code>{{metrics}}</code> becomes the text the card sent.'), v('Tools', '[]', 'Tools the model may call, such as MCP servers. None here; must be <code>[]</code>, never empty.'), v('RAG', '{}', 'Documents the model may search before answering. None here; must be <code>{}</code>, never empty.')]))
p.step('warn', 'Never leave <b>Tools</b> or <b>RAG</b> empty: the save fails with &ldquo;Unable to parse definition&rdquo;. After <b>Update</b>, open <b>Source</b> once and check that <code>&lt;prompt&gt;</code> still has the text; an empty prompt saves fine, but the agent never answers.')
p.step('say', '<code>{{metrics}}</code> is replaced by the text the card sends. Only the node&rsquo;s input variables are replaced.')
p.step('code', code_block('ldp-demo-card.js', code[4], code[5]))
p.step(*ship(5))
p.step('ui', '<ol><li>Right card &rarr; <b>&#10022; AI insight</b>.</li></ol>')
p.step('check', '&ldquo;Asking AI Hub&hellip;&rdquo;, then two or three sentences citing the value, the previous period and one action.')
p.step('say', 'We format the text before sending it: plain labeled lines. Easier for the model, and the firewall in front of AI Hub rejects nested JSON.')
parts.append(p)



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


nav = ''.join(f'<li><a href="#part-{p.letter.lower()}"><span class="a-letter">{p.letter}</span><span class="a-title">{p.title}</span><span class="a-topic">{p.topic}</span></a></li>' for p in parts)
nav += '<li><a href="#reset-demo"><span class="a-letter">&#8634;</span><span class="a-title">Reset the demo</span><span class="a-topic">Start over</span></a></li>'


page = f'''<title>Live Demo Guide</title>
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
	--code-comment: #8f9bbd;
	--code-keyword: #7fb2ff;
	--code-string: #f2c78a;
	--code-number: #f29e74;
	--code-fn: #8fe3c4;
	--code-type: #c3a6ff;
	--line-soft: rgba(38, 50, 82, 0.5);
	--code-old: #4a5576;
	--display: 'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif;
	--body: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
	--mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
}}

* {{ box-sizing: border-box; }}

body {{
	background: var(--bg);
	color: var(--fg);
	font: 17px/1.6 var(--body);
	padding-inline: 16px;
}}

.wrap {{ margin: 0 auto; max-width: 1180px; padding-block: 32px 96px; }}

a {{ color: var(--accent); }}

code {{ font-family: var(--mono); font-size: 0.88em; background: var(--surface-2); border-radius: 4px; padding: 1px 5px; overflow-wrap: anywhere; }}

.hero {{ display: grid; gap: 12px; padding-block: 8px 24px; }}
.eyebrow {{ color: var(--accent); font: 600 12px/1 var(--mono); letter-spacing: 0.14em; text-transform: uppercase; }}
h1 {{ font: 800 clamp(30px, 6vw, 46px)/1.05 var(--display); letter-spacing: -0.02em; margin: 0; text-wrap: balance; }}
.hero p {{ color: var(--muted); margin: 0; max-width: 62ch; }}

.login {{ align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; display: flex; flex-wrap: wrap; gap: 10px 14px; padding: 14px 16px; }}
.login .label {{ color: var(--muted); font: 600 11px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; }}
.login code {{ background: none; flex: 1 1 280px; min-width: 0; padding: 0; }}

.agenda {{ border-block: 1px solid var(--line-soft); margin-top: 8px; padding-block: 18px; scroll-margin-top: 16px; }}
.agenda-title {{ color: var(--muted); font: 600 12px/1 var(--mono); letter-spacing: 0.14em; margin: 0 0 10px; text-transform: uppercase; }}
.agenda ol {{ display: grid; list-style: none; margin: 0; padding: 0; }}
.agenda a {{ align-items: baseline; border-top: 1px solid var(--line-soft); color: var(--fg); display: grid; gap: 16px; grid-template-columns: 2.2em minmax(0, 1fr) auto; padding: 10px 4px; text-decoration: none; }}
.agenda li:first-child a {{ border-top: 0; }}
.agenda a:hover .a-title, .agenda a:focus-visible .a-title {{ color: var(--accent); }}
.a-letter {{ color: var(--accent); font: 800 20px/1 var(--display); }}
.a-title {{ font: 600 20px/1.3 var(--display); }}
.a-topic {{ color: var(--muted); font: 500 13px/1 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; }}
.to-agenda {{ background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); color: var(--fg); font-size: 14px; padding: 8px 14px; position: fixed; right: 16px; text-decoration: none; z-index: 5; }}
.to-agenda:hover {{ border-color: var(--accent); }}
.toggles {{ display: flex; flex-wrap: wrap; gap: 8px 20px; }}
.toggle {{ align-items: center; color: var(--muted); cursor: pointer; display: flex; flex: none; font-size: 15px; gap: 6px; }}
body.no-say .k-say {{ display: none; }}

.part {{ padding-top: 40px; scroll-margin-top: 16px; }}
.part-head {{ align-items: center; display: flex; gap: 14px; margin-bottom: 18px; }}
.letter {{ align-items: center; background: var(--accent-soft); border: 1px solid var(--accent); border-radius: 10px; color: var(--accent); display: flex; flex: none; font: 800 22px/1 var(--display); height: 44px; justify-content: center; width: 44px; }}
h2 {{ font: 700 28px/1.15 var(--display); margin: 0; text-wrap: balance; }}
.topic {{ color: var(--muted); font: 500 12px/1 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; }}

.steps {{ display: grid; gap: 10px; list-style: none; margin: 0; padding: 0; }}
.step {{ background: var(--surface); border: 1px solid var(--line); border-radius: 12px; display: grid; gap: 12px; grid-template-columns: auto minmax(0, 1fr); padding: 14px 16px; }}
.step.is-done {{ opacity: 0.45; }}
.step-body {{ display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr); min-width: 0; }}
.step-body > * {{ max-width: 100%; min-width: 0; }}
.step-body p {{ margin: 0; }}
.step-body ol {{ display: grid; gap: 4px; margin: 0; padding-left: 20px; }}
.kind {{ font: 600 12px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; }}
.k-ui .kind {{ color: var(--accent); }}
.k-code .kind {{ color: var(--fg); }}
.k-say {{ background: transparent; border-style: dashed; border-color: color-mix(in srgb, var(--say) 45%, transparent); }}
.k-say .kind {{ color: var(--say); }}
.k-say p {{ font-size: 19px; font-style: italic; line-height: 1.5; }}
.k-check {{ border-color: color-mix(in srgb, var(--check) 40%, transparent); }}
.k-check .kind {{ color: var(--check); }}
.k-warn {{ border-color: color-mix(in srgb, var(--warn) 40%, transparent); }}
.k-warn .kind {{ color: var(--warn); }}

.done {{ cursor: pointer; padding-top: 1px; }}
.done input {{ accent-color: var(--check); cursor: pointer; height: 18px; width: 18px; }}
.sr {{ clip: rect(0 0 0 0); height: 1px; overflow: hidden; position: absolute; width: 1px; }}

.table-scroll {{ overflow-x: auto; }}
.values {{ border-collapse: collapse; width: 100%; }}
.values th, .values td {{ border-top: 1px solid var(--line-soft); padding: 8px 10px 8px 0; text-align: left; vertical-align: middle; }}
.values tr:first-child th, .values tr:first-child td {{ border-top: 0; }}
.values th {{ color: var(--muted); font-weight: 500; white-space: nowrap; width: 1%; }}
.values td:last-child {{ text-align: right; width: 1%; }}
.values thead th {{ color: var(--muted); font: 600 11px/1 var(--mono); letter-spacing: 0.12em; padding-bottom: 10px; text-transform: uppercase; }}
.values.described td:nth-child(2) {{ width: 38%; }}
.values .purpose {{ color: var(--muted); font-size: 15px; line-height: 1.45; }}
.values td code {{ white-space: pre-wrap; }}
.pill {{ background: var(--accent-soft); border-radius: 999px; color: var(--accent); font-size: 13px; padding: 2px 10px; }}

.copy {{ background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; color: var(--fg); cursor: pointer; font: 500 14px/1 var(--body); padding: 8px 12px; white-space: nowrap; }}
.copy:hover, .copy:focus-visible {{ border-color: var(--accent); outline: none; }}
.copy.ok {{ border-color: var(--check); color: var(--check); }}

.code {{ margin: 0; min-width: 0; }}
.code figcaption {{ align-items: center; display: flex; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 8px; }}
.file {{ font: 600 15px/1 var(--mono); }}
.legend {{ color: var(--muted); flex: 1; font-size: 14px; }}
.code-scroll {{ background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px; max-height: 70vh; overflow: auto; }}
.code pre {{ display: grid; font: 15px/1.6 var(--mono); grid-template-columns: auto 1fr; margin: 0; padding: 12px 0; tab-size: 4; }}
.ln {{ color: var(--code-old); padding: 0 12px 0 14px; text-align: right; user-select: none; }}
.lc {{ padding-right: 16px; white-space: pre; }}
.old {{ color: var(--code-old); }}
.tx, .pu {{ color: var(--code-new); }}
.cm {{ color: var(--code-comment); }}
.kw {{ color: var(--code-keyword); }}
.st {{ color: var(--code-string); }}
.nu {{ color: var(--code-number); }}
.fn {{ color: var(--code-fn); }}
.ty {{ color: var(--code-type); }}
body.flat .old {{ color: #b9c3dc; }}
.code-note {{ color: var(--muted); font-size: 16px; margin: 8px 0 0; }}

.reset-card {{ background: var(--surface); border: 1px solid color-mix(in srgb, var(--warn) 40%, transparent); border-radius: 12px; display: grid; gap: 12px; padding: 16px 18px; }}
.reset-card ol {{ display: grid; gap: 6px; margin: 0; padding-left: 22px; }}
.reset-card p {{ color: var(--muted); margin: 0; }}

.foot {{ align-items: center; color: var(--muted); display: flex; flex-wrap: wrap; font-size: 15px; gap: 12px; justify-content: space-between; padding-top: 32px; }}
.reset {{ background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; color: var(--fg); cursor: pointer; font: inherit; justify-self: start; padding: 8px 14px; }}
.reset:hover, .reset:focus-visible {{ border-color: var(--warn); }}

:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px; }}

@media (max-width: 560px) {{
	.values th {{ white-space: normal; }}
}}

@media (prefers-reduced-motion: reduce) {{
	* {{ scroll-behavior: auto !important; transition: none !important; }}
}}
html {{ scroll-behavior: smooth; }}
</style>

<div class="wrap">
	<header class="hero">
		<span class="eyebrow">DEVCON 2026 &middot; Live demo</span>
		<h1>Live Demo Guide</h1>
		<p>One LDP metric card, from an empty site to an AI insight. Bright code is what changed since the previous step; dimmed code was already there.</p>
		<div class="login">
			<span class="label">Log in</span>
			<code>{e(LOGIN)}</code>
			{copy_button(LOGIN)}
		</div>
		<div class="toggles">
			<label class="toggle"><input id="no-say" type="checkbox"> Hide the &ldquo;Say&rdquo; boxes</label>
			<label class="toggle"><input id="flat" type="checkbox"> Show code without the change highlight</label>
		</div>
	</header>

	<nav class="agenda" id="agenda" aria-label="Agenda">
		<h2 class="agenda-title">Agenda</h2>
		<ol>{nav}</ol>
	</nav>
	<a class="to-agenda" href="#agenda">Agenda &uarr;</a>

	{''.join(render_part(p) for p in parts)}

	<section class="part" id="reset-demo">
		<header class="part-head"><span class="letter">&#8634;</span><div><h2>Reset the demo</h2><span class="topic">Start over</span></div></header>
		<div class="reset-card">
			<ol>
				<li><b>DEVCON Demo</b> &rarr; Site Builder &rarr; <b>Pages</b> &rarr; <b>Demo</b> &rarr; &#8942; &rarr; <b>Delete</b>. Keep <b>Home</b>.</li>
				<li>Applications &rarr; <b>Client Extensions</b> &rarr; <b>LDP Demo Card</b> &rarr; &#8942; &rarr; <b>Delete</b>.</li>
				<li><b>DEVCON Demo</b> &rarr; Documents and Media &rarr; <code>ldp-demo-card.js</code> &rarr; &#8942; &rarr; <b>Move to Recycle Bin</b>.</li>
				<li><b>DEVCON Demo</b> &rarr; <b>Recycle Bin</b> &rarr; <b>Empty the Recycle Bin</b>. Otherwise the next upload gets a different URL.</li>
				<li>Control Panel &rarr; <b>Objects</b> &rarr; folder <b>DEVCON Demo</b> &rarr; <b>Demo Card Config</b> &rarr; &#8942; &rarr; <b>Delete</b>. Its entries go with it.</li>
				<li>AI Hub &rarr; <b>Agent Builder</b> &rarr; <b>DevCon 2026 Demo LDP Metric Insight</b> &rarr; &#8942; &rarr; <b>Delete</b>, so its external reference code is free again.</li>
				<li>In the editor, empty <code>ldp-demo-card.js</code>.</li>
			</ol>
			<button class="reset" id="reset" type="button">Clear all checkmarks</button>
		</div>
	</section>

	<footer class="foot">
		<span>Code from <code>interaminense/devcon-2026-stuff</code>, folder <code>demo/</code>.</span>
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

	for (const id of ['flat', 'no-say']) {{
		const toggle = document.getElementById(id);

		toggle.checked = store.get(id) === '1';
		document.body.classList.toggle(id, toggle.checked);

		toggle.addEventListener('change', () => {{
			document.body.classList.toggle(id, toggle.checked);
			store.set(id, toggle.checked ? '1' : null);
		}});
	}}
}})();
</script>
'''

OUT.write_text(page)
print(OUT, len(page))
