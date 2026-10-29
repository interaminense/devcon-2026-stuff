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
source = source.replace("customElements.get('ldp-metric-card')", "customElements.get('ldp-metric-card-fragment')")
source = source.replace("customElements.define('ldp-metric-card', LdpMetricCard)", "customElements.define('ldp-metric-card-fragment', LdpMetricCard)")

catalog = json.loads(subprocess.run(
	['node', '-e', 'require(process.argv[1]); console.log(JSON.stringify(globalThis.LdpMetricCatalog.map(({group, id, label}) => [id, `${group}: ${label}`])))', str(REPO / 'client-extension-metric-card/ldp-metric-card.js')],
	capture_output=True, check=True, text=True).stdout)

write('ldp-metric-card-fragment', 'LDP Metric Card', source + MOUNT.format(tag='ldp-metric-card-fragment', config='''{
	aiInsight: configuration.aiInsight === true || configuration.aiInsight === 'true',
	chart: configuration.chart || '',
	metric: configuration.metric || 'visitorsMetric',
	range: {key: Number(configuration.rangeKey ?? 30)},
	title: configuration.title || '',
}'''), [
	select('metric', 'Metric', catalog, 'visitorsMetric'),
	select('chart', 'Chart', [('', 'Default for the metric'), ('area', 'Area'), ('line', 'Line'), ('columns', 'Columns'), ('number', 'Number only'), ('bars', 'Horizontal bars'), ('donut', 'Donut'), ('table', 'Table'), ('heatmap', 'Heatmap')], ''),
	select('rangeKey', 'Time range', RANGES + [('365', 'Last 365 days')], '30'),
	{'dataType': 'string', 'defaultValue': '', 'label': 'Title', 'name': 'title', 'type': 'text'},
	checkbox('aiInsight', 'Show AI insight'),
])

source = (REPO / 'client-extension-visitors-behavior/ldp-visitors-behavior.js').read_text()
source = sub(source, '''			this._key = getInstanceKey(this);
			this._config = (this._key && (await loadConfig(this._key))) || {''', '''			// The fragment hands the configuration over: the tabs, the range
			// and the AI switch change the view, and nothing is saved

			this._key = null;
			this._config = this.config || {''')
source = source.replace("'ldp-visitors-behavior'", "'ldp-visitors-behavior-fragment'")

write('ldp-visitors-behavior-fragment', 'LDP Visitors Behavior', source + MOUNT.format(tag='ldp-visitors-behavior-fragment', config='''{
	aiInsight: configuration.aiInsight === true || configuration.aiInsight === 'true',
	metric: configuration.metric || 'visitorsMetric',
	rangeKey: Number(configuration.rangeKey ?? 0),
}'''), [
	select('metric', 'First tab', [('visitorsMetric', 'Unique Visitors'), ('sessionsMetric', 'Sessions'), ('sessionsPerVisitorMetric', 'Sessions/Visitor'), ('sessionDurationMetric', 'Session Duration'), ('bounceRateMetric', 'Bounce Rate')], 'visitorsMetric'),
	select('rangeKey', 'Time range', RANGES, '0'),
	checkbox('aiInsight', 'Show AI insight'),
])

(OUT / 'collection.json').write_text(json.dumps({
	'description': 'The Swell Lab dashboard cards as fragments, configured per instance.',
	'name': 'Swell Lab Dashboard',
}, indent='\t') + '\n')

print(sorted(str(p.relative_to(OUT)) for p in OUT.rglob('*') if p.is_file()))
