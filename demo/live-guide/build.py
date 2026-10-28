import difflib
import html
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from diagram import render as render_diagram, render_walkthrough

DEMO = pathlib.Path.home() / 'dev/projects/devcon-2026/devcon-2026-stuff/demo'
SHORT = 'short' in sys.argv[1:]
OUT = pathlib.Path(__file__).parent / ('devcon-live-guide-short.html' if SHORT else 'devcon-live-guide.html')

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
	label = 'All new' if prev is None else ''
	note_html = f'<p class="code-note">{note}</p>' if note and not SHORT else ''

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
	body = []

	for row in rows:
		field, value, copyable = row[:3]

		if copyable:
			body.append(f'<tr><th scope="row">{field}</th><td><code>{e(value)}</code></td><td>{copy_button(value)}</td></tr>')
		else:
			body.append(f'<tr><th scope="row">{field}</th><td>{value}</td><td></td></tr>')

	head = f'<caption>{title}</caption>' if title else ''

	return f'<div class="table-scroll"><table class="values">{head}<tbody>{''.join(body)}</tbody></table></div>'


def v(field, value, purpose=None):
	return (field, value, True) if purpose is None else (field, value, True, purpose)


def plain(field, value, purpose=None):
	return (field, value, False) if purpose is None else (field, value, False, purpose)


class Part:

	def __init__(self, letter, title, topic, intro=''):
		self.letter, self.title, self.topic, self.intro = letter, title, topic, intro
		self.items = []

	def step(self, kind, body):
		self.items.append((kind, body))

		return self


KIND = {
	'ui': 'In the UI',
	'code': 'In the editor',
	'say': 'Say',
}


def ship(n):
	return ('ui', f'''<p class="step-title"><strong>Ship version {n}</strong></p>
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
p.step('ui', f'''<p class="step-title"><strong>Log in</strong></p>
<ol>
	<li>Open the link below and sign in.</li>
</ol>
<div class="table-scroll"><table class="values"><tbody><tr><th scope="row">Log in</th><td><a href="{e(LOGIN)}" target="_blank" rel="noopener">DEVCON Demo sign-in &nearr;</a></td><td>{copy_button(LOGIN)}</td></tr></tbody></table></div>''')
p.step('ui', '''<ol>
	<li>Tab 2: Control Panel &rarr; Instance Settings &rarr; Platform &rarr; <b>Analytics Cloud</b>. Point at <b>Connected</b>.</li>
	<li><b>Properties</b> tab: show <b>SWELL LAB DevCon 2026</b> and the synced Swell Lab site.</li>
</ol>''')
parts.append(p)

p = Part('2', 'The first client extension', 'Topic 04')
p.step('code', code_block('ldp-demo-card.js', None, code[1], 'A Custom Element is a plain web component: a class and a tag name.'))
p.step('ui', '<p class="step-title"><strong>Host it in Documents and Media</strong></p><ol><li>Tab 3: check the site is <b>DEVCON Demo</b> &rarr; Content &amp; Data &rarr; <b>Documents and Media</b>.</li><li><b>New</b> &rarr; <b>File Upload</b> &rarr; pick the file &rarr; <b>Publish</b>.</li></ol>'
	+ values([v('Title', 'ldp-demo-card.js'), plain('URL it gets', f'<code>{DOC_URL}</code>')]))
p.step('ui', '<p class="step-title"><strong>Register the Custom Element</strong></p><ol><li>Tab 4: Applications &rarr; <b>Client Extensions</b> &rarr; <b>New</b> &rarr; <b>Add Custom Element</b>.</li><li>Fill in the fields below &rarr; <b>Publish</b>.</li></ol>'
	+ values([v('Name', 'LDP Demo Card'), v('HTML Element Name', 'ldp-demo-card'), v('JavaScript URL', f'{DOC_URL}?v=1'), plain('Instanceable', '<span class="pill">checked</span>')]))
p.step('say', 'Instanceable lets the same card go on a page twice, each with its own configuration. That is the whole dashboard idea.')
p.step('ui', '<p class="step-title"><strong>Put it on a page</strong></p><ol><li>Tab 5: DEVCON Demo &rarr; Site Builder &rarr; <b>Pages</b> &rarr; <b>New</b>.</li><li><b>Basic Templates</b> &rarr; <b>Blank</b> &rarr; name below &rarr; <b>Add</b>.</li><li><b>Components</b> panel &rarr; <b>Fragments</b> &rarr; Layout Elements &rarr; drag <b>Grid</b>. Set <b>Number of Modules</b> to 2.</li><li><b>Widgets</b> tab &rarr; search the name below &rarr; drag it into the <b>left</b> module &rarr; <b>Publish</b>.</li></ol>'
	+ values([v('Page name', 'Demo'), v('Widget search', 'LDP Demo Card')]))
parts.append(p)

p = Part('3', 'Real LDP data', 'Topic 04')
p.step('say', 'The card calls DXP on the same origin, with the user&rsquo;s session and the CSRF token. DXP forwards the GraphQL query to LDP. No LDP token in the browser.')
p.step('ui', '<p class="step-title"><strong>Get the channel ID from LDP</strong></p><ol><li>Tab 1: open <code>ldp-internal.liferay.com</code> &rarr; workspace <b>Liferay Data Platform</b> &rarr; property <b>SWELL LAB DevCon 2026</b> &rarr; <b>Sites</b>.</li><li>The channel ID is the number in the URL, between the workspace and <code>/sites</code>. Copy it.</li><li>Leave the Sites dashboard on <b>Last 7 days</b>: the card must show the same numbers.</li></ol>'
	+ values([v('LDP Sites URL', 'https://ldp-internal.liferay.com/workspace/liferay-data-platform/845351493326064678/sites'), v('Channel ID', '845351493326064678')]))
p.step('say', 'One property is one channel. The channel ID is all the card needs to know whose data to ask for.')
p.step('code', code_block('ldp-demo-card.js', code[1], code[2], 'Point at <code>CHANNEL_ID</code>, <code>RANGE_KEY = 7</code>, the <code>site</code> query and the <code>x-csrf-token</code> header.'))
p.step(*ship(2))
parts.append(p)

p = Part('4', 'Two instances, one card', 'Topic 04')
p.step('say', 'Now a real card: a metric picker, the value, and the trend against the previous period, which LDP computes for us.')
p.step('code', code_block('ldp-demo-card.js', code[2], code[3], 'Point at <code>METRICS</code> and <code>formatTrend</code>. The config lives only in memory.'))
p.step(*ship(3))
p.step('ui', '<ol><li>Edit the Demo page &rarr; drag a second <b>LDP Demo Card</b> into the <b>right</b> module &rarr; <b>Publish</b>.</li><li>Right card &rarr; select <b>Sessions per visitor</b>.</li><li>Reload the page.</li></ol>')
p.step('say', 'The setting was in memory, so it is gone. A dashboard has to remember each card, separately, and we do not want a backend for that.')
parts.append(p)

p = Part('5', 'Persistence with Objects', 'Topic 05')
p.step('ui', '<p class="step-title"><strong>Create the Object</strong></p><ol><li>Control Panel &rarr; Object &rarr; <b>Objects</b> &rarr; folder <b>DEVCON Demo</b> &rarr; <b>Create New Object</b> &rarr; fill in &rarr; <b>Save</b>.</li></ol>'
	+ values([v('Label', 'Demo Card Config'), v('Plural Label', 'Demo Card Configs'), v('Object Name', 'DemoCardConfig')])
	+ '<ol start="2"><li><b>Fields</b> &rarr; <b>Add Field</b> &rarr; fill in &rarr; <b>Save</b>.</li></ol>'
	+ values([v('Label', 'Metric'), v('Field Name', 'metric'), plain('Type', '<span class="pill">Text</span>')])
	+ '<ol start="3"><li><b>Details</b> &rarr; Scope <b>Company</b> &rarr; <b>Publish</b>.</li></ol>')
p.step('say', 'Publishing the Object gives us a REST API for free, at /o/c/democardconfigs. Each entry is keyed by the widget instance id, which DXP already generates.')
p.step('code', code_block('ldp-demo-card.js', code[3], code[4]))
p.step(*ship(4))
p.step('ui', '<ol><li>Right card &rarr; select <b>Sessions per visitor</b>.</li><li>Reload the page.</li></ol>')
parts.append(p)

p = Part('6', 'AI Hub insight', 'Topic 05')
p.step('ui', '<p class="step-title"><strong>Connect DXP to AI Hub</strong></p><ol><li>Tab 6: AI Hub &rarr; the account configuration &rarr; copy the <b>Client ID</b> and the <b>Client Secret</b>.</li><li>In the same configuration, check the <b>Environment URL</b>: the DXP address below, with no slash at the end.</li><li>Tab 2: Control Panel &rarr; Instance Settings &rarr; Platform &rarr; <b>AI Hub</b> &rarr; paste the values &rarr; <b>Save</b>.</li></ol>'
	+ values([
		plain('Client ID', 'Copied from AI Hub', 'Tells AI Hub which DXP is asking for a token.'),
		plain('Client Secret', 'Copied from AI Hub', 'Proves the request really comes from this DXP. It stays on the DXP server, so the browser never sees it.'),
		v('Service URL', 'https://na1.hub.liferay.com', 'Where DXP asks for tokens. Each region has its own AI Hub.'),
		v('Environment URL (in AI Hub)', 'https://webserver-lctacdemodevcon-prd.lfr.cloud', 'Lets AI Hub accept calls from pages on this DXP (CORS) and call DXP back for the user. Must match exactly, no trailing slash.'),
	]))
p.step('say', 'DXP keeps the secret. The browser only gets a short-lived token from DXP, and AI Hub acts on behalf of the signed-in user.')
p.step('say', 'An AI Hub agent is an agent definition plus a workflow with an LLM node. The card sends what it shows; AI Hub never reads LDP itself.')
p.step('ui', '<p class="step-title"><strong>Create the agent</strong></p><ol><li>Tab 6: AI Hub &rarr; <b>Agent Builder</b>.</li><li><b>Make Shorter</b> &rarr; &#8942; &rarr; <b>Duplicate</b>.</li><li>On the copy: &#8942; &rarr; <b>View</b> &rarr; fill in the fields below &rarr; <b>Save</b>.</li></ol>'
	+ values([v('Title', 'DevCon 2026 Demo LDP Metric Insight', 'How you find this agent in Agent Builder.'), v('Description', 'Turns one LDP metric from the DEVCON demo card into a short insight.', 'Tells people, and the AI Hub assistant that picks agents, when to use this one.'), v('External reference code', 'DEVCON_2026_DEMO_LDP_METRIC_INSIGHT', 'The name the card uses to start this agent. The answer comes back as an event with the same name.'), v('Input variables', 'metrics', 'The card sends its metric summary under this name, so the agent knows where to find it.'), v('Output variable', 'insight', 'Picks which workflow result goes back to the card: the insight text. Must match the node&rsquo;s output variable.')]))
p.step('say', 'The external reference code is the agent&rsquo;s address. It is the only thing the card needs to know about it.')
p.step('ui', '<p class="step-title"><strong>Write its workflow</strong></p><ol><li><b>View Workflow</b> &rarr; click the LLM node in the middle.</li><li>In the panel on the right, fill in the fields below &rarr; <b>Update</b>.</li></ol>'
	+ values([v('Node Name', 'ldpMetricInsight', 'Labels the LLM step. The card doesn&rsquo;t depend on it, so any name works; a clear one makes the workflow easy to read.'), v('Input variables', '[{"name":"metrics","type":"string"}]', 'Lets the step use the card&rsquo;s summary: <code>{{metrics}}</code> is filled in only because it is listed here.'), v('Output variables', '[{"name":"insight","type":"string"}]', 'Saves the model&rsquo;s reply as <code>insight</code>, the value the agent returns to the card.'), v('Prompt', PROMPT, 'Tells the model what to write for whom, and what to avoid, like inventing numbers.'), v('User message', 'Metric summary:\n{{metrics}}', 'What the model actually answers: the card&rsquo;s numbers, dropped in where <code>{{metrics}}</code> is.'), v('Tools', '[]', 'No tools needed: the card already sends all the data. Must be <code>[]</code>; an empty field breaks the save.'), v('RAG', '{}', 'No documents to search: the answer comes only from the card&rsquo;s numbers. Must be <code>{}</code>; an empty field breaks the save.')]))
p.step('say', '<code>{{metrics}}</code> is replaced by the text the card sends. Only the node&rsquo;s input variables are replaced.')
p.step('code', code_block('ldp-demo-card.js', code[4], code[5]))
p.step(*ship(5))
p.step('ui', '<ol><li>Right card &rarr; <b>&#10022; AI insight</b>.</li></ol>')
p.step('say', 'We format the text before sending it: plain labeled lines. Easier for the model, and the firewall in front of AI Hub rejects nested JSON.')
parts.append(p)

# The short guide ships four versions instead of five: the first upload
# already reads LDP. It reuses the full guide's UI steps, without the
# presenter notes
if SHORT:
	ldp, first, data, two, objects, hub = [part.items for part in parts]
	name = 'ldp-demo-card.js'

	p1 = Part('1', 'Connect to LDP and Fetch Real Data', 'Topic 01')
	p1.step('sub', 'LDP connected to DXP')
	p1.step(*ldp[1]).step(*ldp[2]).step(*data[1])
	p1.step('sub', 'The first client extension')
	p1.step('code', code_block(name, None, code[2]))
	p1.step(*first[1]).step(*first[2]).step(*first[4])
	p1.step('sub', 'Two metrics, one card')
	p1.step('code', code_block(name, code[2], code[3]))
	p1.step(*ship(2)).step(*two[3])

	p2 = Part('2', 'Persist Card Settings with Liferay Objects', 'Topic 02')
	p2.step(*objects[0])
	p2.step('code', code_block(name, code[3], code[4]))
	p2.step(*ship(3)).step(*objects[4])

	p3 = Part('3', 'Get Data Insights with AI Hub', 'Topic 03')
	p3.step(*hub[0]).step(*hub[3]).step(*hub[5])
	p3.step('code', code_block(name, code[4], code[5]))
	p3.step(*ship(4)).step(*hub[9])

	parts = [p1, p2, p3]


def render_part(part):
	steps = []

	for index, (kind, body) in enumerate(part.items, 1):
		if kind == 'sub':
			steps.append(f'<li class="sub"><h3>{body}</h3></li>')

			continue

		key = f'{part.letter}{index}'
		steps.append(f'''
<li class="step k-{kind}">
	{'' if kind == 'say' or SHORT else f'<label class="done"><input id="done-{key}" type="checkbox" data-key="{key}"><span class="sr">Done</span></label>'}
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
	{f'<p class="part-intro">{part.intro}</p>' if part.intro else ''}
	<ol class="steps">{''.join(steps)}</ol>
</section>'''


DIAGRAM_MODAL = f'''<dialog class="diagram-modal" id="diagram-modal" aria-label="Diagram Flow">
		<button class="close-diagram" id="close-diagram" type="button" aria-label="Close">&times;</button>
		{render_diagram()}
	</dialog>'''

OPTIONS = '''	<aside class="options" id="options">
		<button class="options-tab" id="options-tab" type="button" aria-controls="options-panel" aria-expanded="false" aria-label="Show options">&lsaquo;</button>
		<div class="options-panel" id="options-panel" hidden>
			<label class="toggle"><input id="no-say" type="checkbox"> Hide the &ldquo;Say&rdquo; boxes</label>
		</div>
	</aside>
'''

RESET = '''	<section class="part" id="reset-demo">
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
'''

# Steps have no checkbox column; code boxes take the full width, grow to fit
# the whole file and wrap long lines, so nothing scrolls
SHORT_CSS = '''.step { grid-template-columns: minmax(0, 1fr); }
.code-scroll { max-height: none; overflow: visible; }
.lc { overflow-wrap: anywhere; white-space: pre-wrap; }'''

LEDE = (
	"Today we're going to build a custom dashboard card right inside DXP, in three moves: read real LDP data, remember each card's settings with Objects, and ask AI Hub what the numbers mean."
	if SHORT else
	"Today we're going to build a custom dashboard right inside DXP, using the Liferay tools you already have. We keep the flow simple on purpose: easy to follow, and easy to build yourself."
)

nav = ''.join(f'<li><a href="#part-{p.letter.lower()}"><span class="a-letter">{p.letter}</span><span class="a-title">{p.title}</span><span class="a-topic">{p.topic}</span></a></li>' for p in parts)
nav += '' if SHORT else '<li><a href="#reset-demo"><span class="a-letter">&#8634;</span><span class="a-title">Reset the demo</span><span class="a-topic">Start over</span></a></li>'


page = f'''<title>{'Live Demo Short Guide' if SHORT else 'Live Demo Guide'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700;800&amp;family=JetBrains+Mono:wght@400;600&amp;display=swap">
<style>
/* Layout: one reading column, a sticky part switcher on top, each part a numbered run of typed steps. */
:root {{
	color-scheme: dark;
	--bg: #00072b;
	--surface: #0a1145;
	--surface-2: #141c5c;
	--line: #27307a;
	--fg: #ffffff;
	--muted: #a3abd6;
	--accent: #e500bd;
	--accent-soft: rgba(229, 0, 189, 0.16);
	--say: #00c2fb;
	--check: #5fd3a2;
	--warn: #f60062;
	--code-bg: #000420;
	--code-new: #f4f7ff;
	--code-comment: #8f9bbd;
	--code-keyword: #7fb2ff;
	--code-string: #f2c78a;
	--code-number: #f29e74;
	--code-fn: #8fe3c4;
	--code-type: #c3a6ff;
	--line-soft: rgba(39, 48, 122, 0.5);
	--c-dxp: #3d7bff;
	--c-ldp: #00c2fb;
	--c-hub: #e500bd;
	--code-old: #4c5590;
	--display: 'Source Sans 3', 'Source Sans Pro', 'Segoe UI', system-ui, sans-serif;
	--body: 'Source Sans 3', 'Source Sans Pro', 'Segoe UI', system-ui, sans-serif;
	--mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
}}

* {{ box-sizing: border-box; }}

body {{
	background: var(--bg);
	color: var(--fg);
	font: 20px/1.6 var(--body);
	padding-inline: 16px;
}}

.wrap {{ margin: 0 auto; max-width: 1280px; padding-block: 32px 96px; }}

a {{ color: var(--accent); }}

code {{ font-family: var(--mono); font-size: 0.88em; background: var(--surface-2); border-radius: 4px; padding: 1px 5px; overflow-wrap: anywhere; }}

.hero {{
	background:
		radial-gradient(circle at 0% 0%, rgba(11, 95, 255, 0.85) 0, transparent 45%),
		radial-gradient(circle at 100% 100%, rgba(229, 0, 189, 0.85) 0, transparent 50%),
		radial-gradient(circle at 70% 20%, rgba(123, 44, 255, 0.55) 0, transparent 45%),
		linear-gradient(135deg, #030028 0%, #1514a4 55%, #3a0a8a 100%);
	border-radius: 20px;
	display: grid;
	gap: 14px;
	margin-bottom: 8px;
	padding: 36px 36px 30px;
}}
.eyebrow {{ color: #ff7ce6; font: 700 15px/1 var(--body); letter-spacing: 0.16em; text-transform: uppercase; }}
h1 {{ font: 700 clamp(34px, 6vw, 54px)/1.05 var(--display); letter-spacing: -0.01em; margin: 0; text-wrap: balance; }}
.lede {{ color: rgba(255, 255, 255, 0.86); font-size: 22px; line-height: 1.5; margin: 0; max-width: 60ch; }}


.agenda {{ border-block: 1px solid var(--line-soft); margin-top: 8px; padding-block: 18px; scroll-margin-top: 16px; }}
.agenda-title {{ color: var(--muted); font: 600 14px/1 var(--mono); letter-spacing: 0.14em; margin: 0 0 10px; text-transform: uppercase; }}
.agenda ol {{ display: grid; list-style: none; margin: 0; padding: 0; }}
.agenda a {{ align-items: baseline; border-top: 1px solid var(--line-soft); color: var(--fg); display: grid; gap: 16px; grid-template-columns: 2.2em minmax(0, 1fr) auto; padding: 10px 4px; text-decoration: none; }}
.agenda li:first-child a {{ border-top: 0; }}
.agenda a:hover .a-title, .agenda a:focus-visible .a-title {{ color: var(--accent); }}
.a-letter {{ color: var(--accent); font: 800 24px/1 var(--display); }}
.a-title {{ font: 600 24px/1.3 var(--display); }}
.a-topic {{ color: var(--muted); font: 500 15px/1 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; }}
.to-agenda {{ background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); color: var(--fg); font-size: 17px; padding: 8px 14px; position: fixed; right: 16px; text-decoration: none; z-index: 5; }}
.to-agenda:hover {{ border-color: var(--accent); }}
.below-hero {{ display: flex; flex-wrap: wrap; gap: 12px; padding-block: 28px; }}
.dg-card-saved {{ fill: var(--check); font: 600 11px var(--mono); }}
#walk-modal[open] {{ display: flex; flex-direction: column; overflow: hidden; }}
.walk {{ flex: 1; grid-template-rows: auto minmax(0, 1fr) auto; min-height: 0; }}
.walk .diagram-scroll {{ display: flex; justify-content: center; min-height: 0; overflow: hidden; }}
.walk .diagram-scroll svg {{ height: 100%; max-width: 100%; min-width: 0; width: auto; }}
.an-g {{ transition: opacity 0.6s ease; }}
.an-g.is-hidden {{ opacity: 0; }}
.an-g.is-past {{ opacity: 0.35; }}
.an-g.is-now .dg-line {{ animation: an-flow 0.9s linear infinite; stroke-dasharray: 9 6; stroke-width: 2.4; }}
.an-g.is-now .dg-box[class*="app-"], .an-g.is-now .dg-card {{ filter: drop-shadow(0 0 8px color-mix(in srgb, var(--c, var(--accent)) 70%, transparent)); }}
@keyframes an-flow {{ to {{ stroke-dashoffset: -30; }} }}
.walk-bar {{ align-items: center; display: flex; flex-wrap: wrap; gap: 16px 24px; justify-content: space-between; }}
.walk-captions {{ flex: 1 1 420px; min-height: 84px; min-width: 0; }}
.walk-caption {{ align-items: flex-start; display: flex; gap: 14px; }}
.walk-caption[hidden] {{ display: none; }}
.walk-caption h3 {{ font: 700 22px/1.2 var(--display); margin: 0 0 4px; }}
.walk-caption p {{ color: var(--muted); font-size: 18px; margin: 0; max-width: 70ch; }}
.walk-n {{ align-items: center; background: var(--accent); border-radius: 10px; color: var(--fg); display: flex; flex: none; font: 700 16px/1 var(--mono); height: 40px; justify-content: center; min-width: 40px; padding: 0 8px; }}
.walk-controls {{ align-items: center; display: flex; flex-wrap: wrap; gap: 8px; }}
.walk-btn {{ background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; color: var(--fg); cursor: pointer; font: 600 16px/1 var(--body); min-width: 40px; padding: 10px 12px; }}
.walk-btn:hover, .walk-btn:focus-visible {{ border-color: var(--accent); }}
.walk-play {{ min-width: 80px; }}
.walk-dots {{ display: flex; gap: 6px; margin-left: 8px; }}
.walk-dot {{ background: transparent; border: 1px solid var(--line); border-radius: 50%; color: var(--muted); cursor: pointer; font: 600 12px/1 var(--mono); height: 28px; padding: 0; width: 28px; }}
.walk-dot.is-done {{ border-color: var(--accent); color: var(--fg); }}
.walk-dot.is-now {{ background: var(--accent); border-color: var(--accent); color: var(--fg); }}
.options {{ align-items: stretch; display: flex; position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 6; }}
.options-tab {{ background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px 0 0 10px; border-right: 0; color: var(--fg); cursor: pointer; font: 700 26px/1 var(--body); padding: 14px 10px; }}
.options-tab:hover, .options-tab:focus-visible {{ border-color: var(--accent); color: var(--accent); }}
.options-panel {{ align-items: center; background: var(--surface-2); border: 1px solid var(--line); border-right: 0; display: flex; padding: 14px 18px calc(14px) 14px; padding-right: max(18px, env(safe-area-inset-right, 0px)); }}
.options-panel[hidden] {{ display: none; }}
.toggle {{ align-items: center; color: var(--fg); cursor: pointer; display: flex; font-size: 18px; gap: 8px; white-space: nowrap; }}
body.no-say .k-say {{ display: none; }}
.show-diagram {{ background: var(--surface-2); border: 1px solid var(--c-dxp); border-radius: 8px; color: var(--fg); cursor: pointer; font: 500 18px/1 var(--body); padding: 9px 14px; }}
.show-diagram:hover, .show-diagram:focus-visible {{ background: color-mix(in srgb, var(--c-dxp) 18%, var(--surface-2)); }}
.diagram-modal {{ background: var(--bg); border: 1px solid var(--line); border-radius: 16px; color: var(--fg); height: 94vh; max-height: none; max-width: none; overflow: auto; padding: 24px 24px 8px; width: 96vw; }}
.diagram-modal::backdrop {{ background: rgba(3, 6, 14, 0.75); backdrop-filter: blur(3px); }}
.close-diagram {{ align-items: center; background: var(--surface-2); border: 1px solid var(--line); border-radius: 50%; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45); color: var(--fg); cursor: pointer; display: flex; font: 400 28px/1 var(--body); height: 44px; justify-content: center; padding: 0 0 3px; position: fixed; right: calc(2vw + 14px); top: calc(3vh + 12px); width: 44px; z-index: 2; }}
.close-diagram:hover, .close-diagram:focus-visible {{ background: var(--accent); border-color: var(--accent); }}
.diagram-modal .diagram {{ margin-top: 0; }}
.diagram {{ display: grid; gap: 16px; margin-top: 8px; }}
.diagram-scroll {{ background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow-x: auto; padding: 16px; }}
.diagram svg {{ display: block; height: auto; min-width: 820px; width: 100%; }}
.app-dxp {{ --c: var(--c-dxp); }}
.app-ldp {{ --c: var(--c-ldp); }}
.app-hub {{ --c: var(--c-hub); }}
.dg-group {{ fill: color-mix(in srgb, var(--c) 5%, transparent); stroke: var(--c); stroke-dasharray: 6 5; stroke-opacity: 0.7; }}
.dg-group-name {{ fill: var(--c); font: 800 18px var(--display); }}
.dg-box {{ fill: var(--surface-2); stroke: var(--line); }}
.dg-box[class*="app-"] {{ fill: color-mix(in srgb, var(--c) 12%, var(--surface)); stroke: var(--c); }}
.dg-box.dg-soft {{ fill: color-mix(in srgb, var(--c) 6%, var(--surface)); stroke-dasharray: 4 4; }}
.dg-browser {{ fill: var(--bg); stroke: var(--fg); stroke-opacity: 0.4; }}
.dg-name {{ fill: var(--fg); font: 700 16px var(--display); }}
.dg-path {{ fill: var(--muted); font: 12px var(--mono); }}
.dg-dashed {{ stroke-dasharray: 4 3; }}
.dg-steps {{ display: grid; gap: 10px; list-style: none; margin: 0; padding: 0; }}
.dg-steps li {{ align-items: baseline; color: var(--muted); display: grid; font-size: 18px; gap: 12px; grid-template-columns: 30px minmax(0, 1fr); }}
.dg-step-n {{ align-items: center; background: var(--c); border-radius: 50%; color: var(--bg); display: inline-flex; font: 700 13px/1 var(--mono); height: 26px; justify-content: center; width: 26px; }}
.dg-card {{ fill: var(--surface); stroke: var(--line); }}
.dg-card-label {{ fill: var(--muted); font: 600 12px var(--display); }}
.dg-card-value {{ fill: var(--fg); font: 700 26px var(--display); }}
.dg-card-trend {{ font: 600 12px var(--mono); }}
.dg-up {{ fill: var(--check); stroke: var(--check); }}
.dg-down {{ fill: var(--warn); stroke: var(--warn); }}
.dg-spark {{ fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }}
.dg-spark-dot {{ stroke: none; }}
.dg-card-ai {{ fill: var(--c-hub); font: 600 12px var(--display); }}
.dg-card-text {{ fill: var(--line); }}
.dg-route {{ fill: var(--c); font: 12px var(--mono); }}
.dg-line {{ fill: none; stroke: var(--muted); stroke-width: 1.6; }}
.dg-line[class*="app-"] {{ stroke: var(--c); }}
.dg-head {{ fill: var(--muted); }}
.dg-head[class*="app-"] {{ fill: var(--c); }}
.dg-badge {{ fill: var(--fg); }}
.dg-badge[class*="app-"] {{ fill: var(--c); }}
.dg-badge-n {{ fill: var(--bg); font: 700 13px var(--mono); }}
.dg-legend {{ align-items: center; color: var(--muted); display: flex; flex-wrap: wrap; font-size: 14px; gap: 8px 18px; margin: 0; }}
.dg-legend span[class*="app-"] {{ align-items: center; color: var(--fg); display: inline-flex; gap: 8px; }}
.dg-legend span[class*="app-"]::before {{ background: var(--c); border-radius: 3px; content: ""; height: 12px; width: 12px; }}

.part {{ padding-top: 72px; scroll-margin-top: 16px; }}
.part-head {{ align-items: center; display: flex; gap: 14px; margin-bottom: 28px; }}
.letter {{ align-items: center; background: var(--accent-soft); border: 1px solid var(--accent); border-radius: 10px; color: var(--accent); display: flex; flex: none; font: 800 26px/1 var(--display); height: 44px; justify-content: center; width: 44px; }}
h2 {{ font: 700 33px/1.15 var(--display); margin: 0; text-wrap: balance; }}
.topic {{ color: var(--muted); font: 500 14px/1 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; }}

.part-intro {{ color: rgba(255, 255, 255, 0.86); font-size: 22px; line-height: 1.5; margin: -8px 0 32px; max-width: 62ch; }}
.steps {{ display: grid; gap: 20px; list-style: none; margin: 0; padding: 0; }}
.steps .sub {{ border-bottom: 1px solid var(--line); margin-top: 28px; padding-bottom: 10px; }}
.steps .sub:first-child {{ margin-top: 0; }}
.steps .sub h3 {{ color: var(--accent); font: 700 24px/1.2 var(--display); margin: 0; }}
.step {{ background: var(--surface); border: 1px solid var(--line); border-radius: 12px; display: grid; gap: 12px; grid-template-columns: auto minmax(0, 1fr); padding: 26px 24px; transition: opacity 0.3s ease, filter 0.3s ease, border-color 0.3s ease; }}
.step.is-done {{ opacity: 0.45; }}
.wrap:has(.step:hover, .step:focus-within) .step:not(:hover, :focus-within) {{ filter: saturate(0.5); opacity: 0.3; }}
.step:hover, .step:focus-within {{ border-color: color-mix(in srgb, var(--accent) 60%, var(--line)); opacity: 1; }}
.step-body {{ display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr); min-width: 0; }}
.step-body > * {{ max-width: 100%; min-width: 0; }}
.step-body p {{ margin: 0; }}
.step-body ol {{ display: grid; gap: 10px; margin: 0; padding-left: 20px; }}
.kind {{ font: 600 14px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; }}
.k-ui .kind {{ color: var(--accent); }}
.step-title {{ font-size: 30px; line-height: 1.25; }}
.k-code .kind {{ color: var(--fg); }}
.k-say {{ grid-template-columns: minmax(0, 1fr); background: transparent; border-style: dashed; border-color: color-mix(in srgb, var(--say) 45%, transparent); }}
.k-say .kind {{ color: var(--say); }}
.k-say p {{ font-size: 22px; font-style: italic; line-height: 1.5; }}

.done {{ cursor: pointer; padding-top: 1px; }}
.done input {{ accent-color: var(--check); cursor: pointer; height: 18px; width: 18px; }}
.sr {{ clip: rect(0 0 0 0); height: 1px; overflow: hidden; position: absolute; width: 1px; }}

.table-scroll {{ overflow-x: auto; }}
.values {{ border-collapse: collapse; font-size: inherit; width: 100%; }}
.values th, .values td {{ border: 1px solid var(--line); padding: 14px 14px; text-align: left; vertical-align: middle; }}
.values th {{ color: var(--muted); font-weight: 500; white-space: nowrap; width: 1%; }}
.values td:last-child {{ text-align: right; width: 1%; }}
.values thead th {{ color: var(--muted); font: 600 13px/1 var(--mono); letter-spacing: 0.12em; padding-bottom: 10px; text-transform: uppercase; }}
.values.described td:nth-child(2) {{ width: 46%; }}
.values .purpose {{ color: var(--muted); font-size: 18px; line-height: 1.45; min-width: 220px; width: 32%; }}
.values td code {{ white-space: pre-wrap; }}
.values a {{ color: var(--say); text-underline-offset: 4px; }}
.values a code {{ color: inherit; }}
.pill {{ background: var(--accent-soft); border-radius: 999px; color: var(--accent); font-size: 15px; padding: 2px 10px; }}

.copy {{ background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; color: var(--fg); cursor: pointer; font: 500 17px/1 var(--body); padding: 8px 12px; white-space: nowrap; }}
.copy:hover, .copy:focus-visible {{ border-color: var(--accent); outline: none; }}
.copy.ok {{ border-color: var(--check); color: var(--check); }}

.code {{ margin: 0; min-width: 0; }}
.code figcaption {{ align-items: center; display: flex; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 8px; }}
.file {{ font: 600 18px/1 var(--mono); }}
.legend {{ color: var(--muted); flex: 1; font-size: 17px; }}
.code-scroll {{ background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px; max-height: 70vh; overflow: auto; }}
.code pre {{ display: grid; font: 18px/1.75 var(--mono); grid-template-columns: auto 1fr; margin: 0; padding: 18px 0; tab-size: 4; }}
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
.code-note {{ color: var(--muted); font-size: 19px; margin: 8px 0 0; }}

.reset-card {{ background: var(--surface); border: 1px solid color-mix(in srgb, var(--warn) 40%, transparent); border-radius: 12px; display: grid; gap: 12px; padding: 16px 18px; }}
.reset-card ol {{ display: grid; gap: 6px; margin: 0; padding-left: 22px; }}
.reset-card p {{ color: var(--muted); margin: 0; }}

.foot {{ align-items: center; color: var(--muted); display: flex; flex-wrap: wrap; font-size: 18px; gap: 12px; justify-content: space-between; padding-top: 32px; }}
.reset {{ background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; color: var(--fg); cursor: pointer; font: inherit; justify-self: start; padding: 8px 14px; }}
.reset:hover, .reset:focus-visible {{ border-color: var(--warn); }}

:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px; }}

@media (max-width: 560px) {{
	.values th {{ white-space: normal; }}
}}

@media (prefers-reduced-motion: reduce) {{
	* {{ animation: none !important; scroll-behavior: auto !important; transition: none !important; }}
}}
html {{ scroll-behavior: smooth; }}
{SHORT_CSS if SHORT else ''}
</style>

<div class="wrap">
	<header class="hero">
		<span class="eyebrow">DEVCON 2026 &middot; Live demo</span>
		<h1>Live Demo Guide</h1>
		{'' if SHORT else f'<p class="lede">{LEDE}</p>'}
	</header>

	<div class="below-hero">
		{'' if SHORT else '<button class="show-diagram" id="open-diagram" type="button">Diagram Flow</button>'}
		<button class="show-diagram" id="open-walk" type="button">{'Diagram Flow' if SHORT else 'Animated Walkthrough'}</button>
	</div>

	{'' if SHORT else OPTIONS}

	{'' if SHORT else DIAGRAM_MODAL}

	<dialog class="diagram-modal" id="walk-modal" aria-label="{'Diagram Flow' if SHORT else 'Animated Walkthrough'}">
		<button class="close-diagram" id="close-walk" type="button" aria-label="Close">&times;</button>
		{render_walkthrough('Diagram Flow', play=False, captions=False) if SHORT else render_walkthrough()}
	</dialog>

	<nav class="agenda" id="agenda" aria-label="Agenda">
		<h2 class="agenda-title">Agenda</h2>
		<ol>{nav}</ol>
	</nav>
	<a class="to-agenda" href="#agenda">Agenda &uarr;</a>

	{''.join(render_part(p) for p in parts)}

	{'' if SHORT else RESET}

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

	const modal = document.getElementById('diagram-modal');

	document.getElementById('open-diagram')?.addEventListener('click', () => modal.showModal());
	document.getElementById('close-diagram')?.addEventListener('click', () => modal.close());
	modal?.addEventListener('click', (event) => {{
		if (event.target === modal) {{
			modal.close();
		}}
	}});

	const walkModal = document.getElementById('walk-modal');
	const walk = document.getElementById('walk');
	const walkSteps = Number(walk.dataset.steps);
	const walkGroups = [...walk.querySelectorAll('.an-g')];
	const walkCaptions = [...walk.querySelectorAll('.walk-caption')];
	const walkDots = [...walk.querySelectorAll('.walk-dot')];
	const walkPlay = document.getElementById('walk-play');
	const WALK_DELAY = 5000;
	let walkStep = 1;
	let walkTimer = null;

	const showWalkStep = (step) => {{
		walkStep = Math.min(Math.max(step, 1), walkSteps);
		const last = walkStep === walkSteps;

		for (const group of walkGroups) {{
			const s = Number(group.dataset.s);

			group.classList.toggle('is-hidden', s > walkStep);
			group.classList.toggle('is-now', !last && s === walkStep);
			group.classList.toggle('is-past', !last && s < walkStep);
		}}

		for (const caption of walkCaptions) {{
			caption.hidden = Number(caption.dataset.step) !== walkStep;
		}}

		for (const dot of walkDots) {{
			const s = Number(dot.dataset.step);

			dot.classList.toggle('is-now', s === walkStep);
			dot.classList.toggle('is-done', s < walkStep);
		}}
	}};

	const stopWalk = () => {{
		clearInterval(walkTimer);
		walkTimer = null;

		if (walkPlay) {{
			walkPlay.textContent = 'Play';
		}}
	}};

	const playWalk = () => {{
		if (walkStep === walkSteps) {{
			showWalkStep(1);
		}}

		clearInterval(walkTimer);
		walkPlay.textContent = 'Pause';
		walkTimer = setInterval(() => {{
			showWalkStep(walkStep + 1);

			if (walkStep === walkSteps) {{
				stopWalk();
			}}
		}}, WALK_DELAY);
	}};

	document.getElementById('open-walk').addEventListener('click', () => {{
		walkModal.showModal();
		showWalkStep(1);

		if (walkPlay) {{
			playWalk();
		}}
	}});
	document.getElementById('close-walk').addEventListener('click', () => walkModal.close());
	walkModal.addEventListener('click', (event) => {{
		if (event.target === walkModal) {{
			walkModal.close();
		}}
	}});
	walkModal.addEventListener('close', stopWalk);
	walkPlay?.addEventListener('click', () => (walkTimer ? stopWalk() : playWalk()));
	walkModal.addEventListener('keydown', (event) => {{
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {{
			event.preventDefault();
			stopWalk();
			showWalkStep(walkStep + (event.key === 'ArrowRight' ? 1 : -1));
		}}
	}});
	document.getElementById('walk-prev').addEventListener('click', () => {{
		stopWalk();
		showWalkStep(walkStep - 1);
	}});
	document.getElementById('walk-next').addEventListener('click', () => {{
		stopWalk();
		showWalkStep(walkStep + 1);
	}});

	for (const dot of walkDots) {{
		dot.addEventListener('click', () => {{
			stopWalk();
			showWalkStep(Number(dot.dataset.step));
		}});
	}}

	showWalkStep(1);

	document.getElementById('reset')?.addEventListener('click', () => {{
		for (const box of boxes) {{
			box.checked = false;
			store.set('done-' + box.dataset.key, null);
			paint(box);
		}}
	}});

	const optionsTab = document.getElementById('options-tab');
	const optionsPanel = document.getElementById('options-panel');

	optionsTab?.addEventListener('click', () => {{
		const open = optionsPanel.hidden;

		optionsPanel.hidden = !open;
		optionsTab.setAttribute('aria-expanded', String(open));
		optionsTab.setAttribute('aria-label', open ? 'Hide options' : 'Show options');
		optionsTab.innerHTML = open ? '&rsaquo;' : '&lsaquo;';
	}});

	for (const id of ['no-say']) {{
		const toggle = document.getElementById(id);

		if (!toggle) {{
			continue;
		}}

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
