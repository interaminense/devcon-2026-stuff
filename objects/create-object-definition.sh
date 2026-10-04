#!/bin/bash

# Creates and publishes the LDP Metric Card object definition, which stores the
# configuration of each ldp-metric-card instance. Safe to run twice: an
# existing definition is reported and left alone.
#
# Usage:
#   DXP_USER=<email> DXP_PASSWORD=<password> objects/create-object-definition.sh

set -o errexit
set -o nounset
set -o pipefail

DIR="$(cd "$(dirname "${0}")" && pwd)"
DXP_URL="${DXP_URL:-http://devcon.localhost:8081}"

function call {
	curl \
		--silent \
		--user "${DXP_USER}:${DXP_PASSWORD}" \
		"${@}"
}

EXISTING=$(
	call \
		--get \
		--data-urlencode "filter=name eq 'LDPMetricCard'" \
		--url "${DXP_URL}/o/object-admin/v1.0/object-definitions" \
	| jq '.items[0] // empty'
)

if [ -n "${EXISTING}" ]
then
	echo "${EXISTING}" | jq '{id, name, restContextPath, status: .status.label}'

	echo "The object definition already exists."

	exit 0
fi

ID=$(
	call \
		--data "@${DIR}/ldp-metric-card.object-definition.json" \
		--header "Content-Type: application/json" \
		--request POST \
		--url "${DXP_URL}/o/object-admin/v1.0/object-definitions" \
	| jq --exit-status '.id'
)

call \
	--request POST \
	--url "${DXP_URL}/o/object-admin/v1.0/object-definitions/${ID}/publish" \
| jq '{id, name, restContextPath, status: .status.label}'
