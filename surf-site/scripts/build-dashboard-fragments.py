"""Builds the Swell Lab Dashboard fragments from the dashboard client
extensions: the same cards, configured by the fragment configuration instead
of the LDP Metric Card Object."""

import json
import pathlib
import subprocess

REPO = pathlib.Path(__file__).resolve().parents[2]
OUT = REPO / 'surf-site/src/fragments/swell-lab-dashboard'

RANGES = [('0', 'Last 24 hours'), ('7', 'Last 7 days'), ('30', 'Last 30 days'), ('90', 'Last 90 days')]


def sub(text, old, new):
	assert old in text, old[:80]

	return text.replace(old, new, 1)


def select(name, label, options, default):
	return {
		'dataType': 'string',
		'defaultValue': default,
		'label': label,
		'name': name,
		'type': 'select',
		'typeOptions': {'validValues': [{'label': l, 'value': v} for v, l in options]},
	}


def checkbox(name, label):
	return {'defaultValue': False, 'label': label, 'name': name, 'type': 'checkbox'}


def write(key, name, js, fields):
	folder = OUT / key
	folder.mkdir(parents=True, exist_ok=True)

	(folder / 'fragment.json').write_text(json.dumps({
		'configurationPath': 'index.json',
		'htmlPath': 'index.html',
		'icon': 'analytics',
		'jsPath': 'index.js',
		'name': name,
		'type': 'component',
	}, indent='\t') + '\n')
	(folder / 'index.html').write_text('<div class="ldp-card-slot"></div>\n')
	(folder / 'index.js').write_text(js)
	(folder / 'index.json').write_text(json.dumps({'fieldSets': [{'fields': fields}]}, indent='\t') + '\n')


# Each instance of the fragment runs this code: the first one defines the card,
# and every one mounts a card with its own configuration

MOUNT = '''
// Each fragment instance mounts one card, configured by its fragment
// configuration. A checkbox comes as a boolean or as the text "true"

const card = document.createElement('{tag}');

card.config = {config};

fragmentElement.querySelector('.ldp-card-slot').append(card);
'''

source = (REPO / 'client-extension-metric-card/ldp-metric-card.js').read_text()
source = sub(source, '''			this._key = getInstanceKey(this);

			this._config = (this._key && (await loadConfig(this._key))) || {''', '''			// The fragment hands the configuration over; nothing is saved

			this._key = null;

			this._config = this.config || {''')
source = sub(source, '''		_canConfigure() {
			return Boolean(globalThis.Liferay?.ThemeDisplay?.isSignedIn());
		}''', '''		_canConfigure() {
			return false;
		}''')
source = sub(source, '''						${
							this._canConfigure()
								? '<button aria-label="Configure" class="cog" data-role="cog" title="Configure" type="button">⚙</button>'
								: ''
						}''', '''						<span class="period">${escape((RANGES.find(({key}) => key === this._config.range.key) || {label: ''}).label)}</span>''')
source = sub(source, '''					${this._config.aiInsight ? '<div class="insight" data-role="insight"></div>' : ''}''', '''					<button class="ai" data-role="ai" hidden type="button"><span>✦ AI insight</span></button>
					<div class="insight" data-role="insight"></div>''')
source = sub(source, '''				if (this._config.aiInsight) {
					this._loadInsight({''', '''				const button = this._get('ai');

				button.hidden = false;

				// The liquid highlight follows the pointer

				button.addEventListener('pointermove', (event) => {
					const box = button.getBoundingClientRect();

					button.style.setProperty('--x', `${event.clientX - box.left}px`);
					button.style.setProperty('--y', `${event.clientY - box.top}px`);
				});

				// The button goes away once the insight is there; after an
				// error it stays, to try again

				button.addEventListener('click', async () => {
					button.disabled = true;

					await this._loadInsight({''')
source = sub(source, '''						period: rangeLabel,
					});
				}''', '''						period: rangeLabel,
					});

					button.disabled = false;
					button.hidden = this._insight?.status === 'done';
				});''')
source = source.replace('<style>${STYLE}</style>', '<style>${STYLE}${FRAGMENT_STYLE}</style>')
source = sub(source, '''	class LdpMetricCard extends HTMLElement {''', '''	// The period sits in the header, as on the demo card, and the AI insight
	// waits for a click

	const FRAGMENT_STYLE = `
		.period {
			color: var(--ldp-muted, #6b6c7e);
			font-size: 13px;
			white-space: nowrap;
		}

		.status {
			display: none;
		}

		.ai {
			background: #e8f6f5;
			border: 1px solid rgba(11, 79, 108, 0.18);
			border-radius: 6px;
			color: var(--ldp-title, #0b4f6c);
			font-weight: 600;
			cursor: pointer;
			font: inherit;
			font-size: 13px;
			isolation: isolate;
			margin-top: 12px;
			overflow: hidden;
			padding: 4px 12px;
			position: relative;
			transition: box-shadow 0.3s ease, transform 0.3s ease;
		}

		.ai[hidden] {
			display: none;
		}

		.ai:disabled {
			cursor: progress;
			opacity: 0.7;
		}

		/* On hover a glossy liquid swirls inside the button, and a bright
		   spot follows the pointer */

		.ai::before {
			animation: ldp-liquid 2.6s linear infinite paused;
			background: conic-gradient(from 0deg, #a8e6e1, #d9f7f4, #9fd8ec, #e3f6ff, #a8e6e1);
			border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%;
			content: '';
			filter: blur(6px);
			inset: -120% -30%;
			opacity: 0;
			position: absolute;
			transition: opacity 0.35s ease;
			z-index: -1;
		}

		.ai::after {
			background: radial-gradient(circle 38px at var(--x, 50%) var(--y, 50%), rgba(255, 255, 255, 0.8), transparent 70%);
			content: '';
			inset: 0;
			opacity: 0;
			pointer-events: none;
			position: absolute;
			transition: opacity 0.25s ease;
		}

		/* The text sits above the liquid and the shine */

		.ai span {
			position: relative;
			z-index: 1;
		}

		.ai:hover:not(:disabled) {
			box-shadow: 0 6px 18px rgba(23, 169, 163, 0.3);
			transform: translateY(-1px);
		}

		.ai:hover:not(:disabled)::before {
			animation-play-state: running;
			opacity: 1;
		}

		.ai:hover:not(:disabled)::after {
			opacity: 1;
		}

		@keyframes ldp-liquid {
			50% {
				border-radius: 58% 42% 37% 63% / 56% 59% 41% 44%;
			}

			to {
				transform: rotate(360deg);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.ai::before {
				animation: none;
			}
		}

		.insight:empty {
			display: none;
		}
	`;

	class LdpMetricCard extends HTMLElement {''')
source = source.replace("customElements.get('ldp-metric-card')", "customElements.get('ldp-metric-card-fragment')")
source = source.replace("customElements.define('ldp-metric-card', LdpMetricCard)", "customElements.define('ldp-metric-card-fragment', LdpMetricCard)")

catalog = json.loads(subprocess.run(
	['node', '-e', 'require(process.argv[1]); console.log(JSON.stringify(globalThis.LdpMetricCatalog.map(({group, id, label}) => [id, `${group}: ${label}`])))', str(REPO / 'client-extension-metric-card/ldp-metric-card.js')],
	capture_output=True, check=True, text=True).stdout)

write('ldp-metric-card-fragment', 'LDP Metric Card', source + MOUNT.format(tag='ldp-metric-card-fragment', config='''{
	chart: configuration.chart || '',
	metric: configuration.metric || 'visitorsMetric',
	range: {key: Number(configuration.rangeKey ?? 7)},
	title: configuration.title || '',
}'''), [
	select('metric', 'Metric', catalog, 'visitorsMetric'),
	select('chart', 'Chart', [('', 'Default for the metric'), ('area', 'Area'), ('line', 'Line'), ('columns', 'Columns'), ('number', 'Number only'), ('bars', 'Horizontal bars'), ('donut', 'Donut'), ('table', 'Table'), ('heatmap', 'Heatmap')], ''),
	select('rangeKey', 'Time range', RANGES + [('365', 'Last 365 days')], '7'),
	{'dataType': 'string', 'defaultValue': '', 'label': 'Title', 'name': 'title', 'type': 'text'},
])

source = (REPO / 'client-extension-visitors-behavior/ldp-visitors-behavior.js').read_text()
source = sub(source, '''			this._key = getInstanceKey(this);
			this._config = (this._key && (await loadConfig(this._key))) || {''', '''			// The fragment hands the configuration over: the tabs, the range
			// and the AI switch change the view, and nothing is saved

			this._key = null;
			this._config = this.config || {''')
source = sub(source, '''						<div class="controls">
							<label class="check">
								<input ${this._config.aiInsight ? 'checked' : ''} name="aiInsight" type="checkbox" />
								AI insight
							</label>
							<select aria-label="Period" name="rangeKey">
								${RANGES.map(({key, label}) => `<option ${key === range.key ? 'selected' : ''} value="${key}">${label}</option>`).join('')}
							</select>
						</div>''', '''						<span class="period">${range.label}</span>''')
source = sub(source, '''					<div class="status">${range.label.toLowerCase()}${this._elapsed ? ` · ${this._elapsed} ms` : ''}</div>
''', '')
source = source.replace('<style>${STYLE}</style>', '<style>${STYLE}.period { color: var(--ldp-muted, #6b6c7e); font-size: 13px; white-space: nowrap; }</style>')
source = source.replace("'ldp-visitors-behavior'", "'ldp-visitors-behavior-fragment'")

write('ldp-visitors-behavior-fragment', 'LDP Visitors Behavior', source + MOUNT.format(tag='ldp-visitors-behavior-fragment', config='''{
	aiInsight: configuration.aiInsight === true || configuration.aiInsight === 'true',
	metric: configuration.metric || 'visitorsMetric',
	rangeKey: Number(configuration.rangeKey ?? 7),
}'''), [
	select('metric', 'First tab', [('visitorsMetric', 'Unique Visitors'), ('sessionsMetric', 'Sessions'), ('sessionsPerVisitorMetric', 'Sessions/Visitor'), ('sessionDurationMetric', 'Session Duration'), ('bounceRateMetric', 'Bounce Rate')], 'visitorsMetric'),
	select('rangeKey', 'Time range', RANGES, '7'),
	checkbox('aiInsight', 'Show AI insight'),
])

(OUT / 'collection.json').write_text(json.dumps({
	'description': 'The Swell Lab dashboard cards as fragments, configured per instance.',
	'name': 'Swell Lab Dashboard',
}, indent='\t') + '\n')

print(sorted(str(p.relative_to(OUT)) for p in OUT.rglob('*') if p.is_file()))
