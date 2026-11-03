"""Builds the LDP Metric Card code page: the fragment's files in tabs, ready to
copy into the fragment editor or a Marketplace listing."""

import html
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
CARD = HERE / 'ldp-metrics/ldp-metric-card'

TABS = [
	('html', 'HTML', 'index.html'),
	('css', 'CSS', 'index.css'),
	('js', 'JavaScript', 'index.js'),
	('config', 'Configuration', 'index.json'),
]

buttons = []
panels = []

for index, (key, label, name) in enumerate(TABS):
	selected = 'true' if index == 0 else 'false'
	code = html.escape((CARD / name).read_text().rstrip('\n'))
	lines = code.count('\n') + 1

	buttons.append(f'<button aria-controls="panel-{key}" aria-selected="{selected}" class="tab" id="tab-{key}" role="tab" type="button">{label}<span class="count">{lines}</span></button>')
	panels.append(f'''<section aria-labelledby="tab-{key}" class="panel" id="panel-{key}" role="tabpanel"{'' if index == 0 else ' hidden'}>
				<div class="panel-bar"><span class="file">{name}</span><button class="copy" data-target="code-{key}" type="button">Copy</button></div>
				<pre><code id="code-{key}">{code}</code></pre>
			</section>''')

page = (HERE / 'template.html').read_text()
page = page.replace('{{tabs}}', '\n\t\t\t\t'.join(buttons)).replace('{{panels}}', '\n\t\t\t'.join(panels))

(HERE / 'ldp-metric-card.html').write_text(page)

print('wrote ldp-metric-card.html')
