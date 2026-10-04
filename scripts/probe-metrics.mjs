// Runs every query in the ldp-metric-card catalog through the DXP GraphQL
// proxy and prints what each metric returns.
//
// Usage:
//   DXP_USER=<email> DXP_PASSWORD=<password> node scripts/probe-metrics.mjs [channelId] [rangeKey]
//
// DXP_URL defaults to http://devcon.localhost:8081. Without a channelId, the
// first LDP property that has a site assigned is used.

import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const DXP_URL = process.env.DXP_URL || 'http://devcon.localhost:8081';
const AUTHORIZATION =
	'Basic ' +
	Buffer.from(`${process.env.DXP_USER}:${process.env.DXP_PASSWORD}`).toString(
		'base64'
	);

const [, , channelIdArgument, rangeKeyArgument] = process.argv;

const rangeKey = Number(rangeKeyArgument || 30);

function loadCatalog() {
	const file = join(
		dirname(fileURLToPath(import.meta.url)),
		'../client-extension-metric-card/ldp-metric-card.js'
	);

	const context = {};

	vm.runInNewContext(readFileSync(file, 'utf8'), context);

	return context.LdpMetricCatalog;
}

async function request(path, options = {}) {
	const response = await fetch(DXP_URL + path, {
		...options,
		headers: {
			'Authorization': AUTHORIZATION,
			'Content-Type': 'application/json',
		},
	});

	const text = await response.text();

	try {
		return {json: JSON.parse(text), status: response.status};
	}
	catch {
		return {json: null, status: response.status, text: text.slice(0, 120)};
	}
}

async function getChannelId() {
	if (channelIdArgument) {
		return channelIdArgument;
	}

	const {json, status} = await request(
		'/o/analytics-settings-rest/v1.0/channels?pageSize=200'
	);

	if (status !== 200) {
		throw new Error(
			`Channels returned ${status}. Is this DXP connected to LDP?`
		);
	}

	const channel = json.items.find((item) =>
		(item.dataSources || []).some(
			(dataSource) => (dataSource.siteIds || []).length
		)
	);

	if (!channel) {
		throw new Error('No LDP property has a site assigned.');
	}

	return channel.channelId;
}

function describe(metric, result) {
	if (metric.shape === 'grid') {
		const cells = result || [];

		return `${cells.length} cells, ${cells.filter(({value}) => value).length} non-zero`;
	}

	if (metric.shape !== 'series') {
		const items = result || [];

		return items.length
			? `${items.length} items, top: ${items
					.slice(0, 3)
					.map(({label, value}) => `${label}=${value}`)
					.join(', ')}`
			: 'empty';
	}

	if (!result) {
		return 'empty';
	}

	const buckets = result.histogram?.metrics || [];

	return [
		`value=${result.value}`,
		`previous=${result.previousValue}`,
		`trend=${result.trend?.percentage ?? '-'}% ${result.trend?.trendClassification ?? ''}`.trim(),
		`buckets=${buckets.length} (${buckets.filter(({value}) => value).length} non-zero)`,
	].join(' ');
}

const catalog = loadCatalog();
const channelId = await getChannelId();

console.log(`${DXP_URL} · channel ${channelId} · last ${rangeKey} days\n`);

let failures = 0;

for (const metric of catalog) {
	const startedAt = Date.now();

	const {json, status, text} = await request(
		'/o/analytics-rest/v1.0/graphql',
		{
			body: JSON.stringify({
				query: metric.query,
				variables: {channelId, interval: 'D', rangeKey},
			}),
			method: 'POST',
		}
	);

	const elapsed = `${Date.now() - startedAt} ms`.padStart(8);

	let outcome;

	if (status !== 200 || !json) {
		outcome = `FAIL HTTP ${status} ${text || JSON.stringify(json).slice(0, 120)}`;
	}
	else if (json.errors || json.error) {
		outcome = `FAIL ${(json.errors?.[0]?.message || json.message || json.error).slice(0, 120)}`;
	}
	else {
		outcome = `OK   ${describe(metric, metric.extract(json.data))}`;
	}

	if (outcome.startsWith('FAIL')) {
		failures++;
	}

	console.log(`${metric.id.padEnd(28)} ${elapsed}  ${outcome}`);
}

console.log(`\n${catalog.length - failures}/${catalog.length} metrics answered`);

process.exitCode = failures ? 1 : 0;
