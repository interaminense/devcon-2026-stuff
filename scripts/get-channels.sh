#!/bin/bash

# Lists the LDP properties (channels) known to DXP and the site IDs each one
# collects data from.

set -o errexit
set -o nounset
set -o pipefail

curl \
	--fail \
	--silent \
	--url "${DXP_URL:-http://localhost:8080}/o/analytics-settings-rest/v1.0/channels?pageSize=200" \
	--user "${DXP_USER}:${DXP_PASSWORD}" \
	| jq '.items[] | {channelId, name, siteIds: [.dataSources[]?.siteIds[]?]}'
