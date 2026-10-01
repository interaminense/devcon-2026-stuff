#!/bin/bash

# Queries the LDP GraphQL schema through the DXP proxy and prints a site-level
# daily histogram.
#
# Usage:
#   get-site-histogram.sh <channelId> [rangeKey] [metric]
#
# rangeKey defaults to 30, metric defaults to visitorsMetric (sessionsMetric
# also works).

set -o errexit
set -o nounset
set -o pipefail

CHANNEL_ID="${1}"
RANGE_KEY="${2:-30}"
METRIC="${3:-visitorsMetric}"

QUERY="query (\$channelId: String!, \$rangeKey: Int) { site(channelId: \$channelId, interval: \"D\", rangeKey: \$rangeKey) { ${METRIC} { histogram { metrics { key value } } } } }"

jq \
	--arg channelId "${CHANNEL_ID}" \
	--arg query "${QUERY}" \
	--argjson rangeKey "${RANGE_KEY}" \
	--null-input \
	'{query: $query, variables: {channelId: $channelId, rangeKey: $rangeKey}}' \
	| curl \
		--data @- \
		--fail \
		--header "Content-Type: application/json" \
		--request POST \
		--silent \
		--url "${DXP_URL:-http://localhost:8080}/o/analytics-rest/v1.0/graphql" \
		--user "${DXP_USER}:${DXP_PASSWORD}" \
	| jq --arg metric "${METRIC}" '.errors // [.data.site[$metric].histogram.metrics[] | select(.value > 0)]'
