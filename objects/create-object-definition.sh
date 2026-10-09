#!/bin/bash

# Creates and publishes an object definition inside the DEVCON 2026 object
# folder. By default it is the LDP Metric Card definition, which stores the
# configuration of each ldp-metric-card instance. Safe to run twice: existing
# pieces are reported and left alone, except that a definition outside the
# folder is moved into it.
#
# Usage:
#   DXP_USER=<email> DXP_PASSWORD=<password> objects/create-object-definition.sh [definition.json]

set -o errexit
set -o nounset
set -o pipefail

DIR="$(cd "$(dirname "${0}")" && pwd)"
DEFINITION_FILE="${1:-${DIR}/ldp-metric-card.object-definition.json}"
DXP_URL="${DXP_URL:-http://devcon.localhost:8081}"
FOLDER_ERC="DEVCON_2026"

function call {
	curl \
		--silent \
		--user "${DXP_USER}:${DXP_PASSWORD}" \
		"${@}"
}

# The Objects screen in 2026.Q3 lists only explicit folders. A definition left
# in the implicit "default" folder works but does not show up there.

FOLDER_STATUS=$(
	call \
		--output /dev/null \
		--url "${DXP_URL}/o/object-admin/v1.0/object-folders/by-external-reference-code/${FOLDER_ERC}" \
		--write-out "%{http_code}"
)

if [ "${FOLDER_STATUS}" == "404" ]
then
	call \
		--data "{\"externalReferenceCode\": \"${FOLDER_ERC}\", \"label\": {\"en_US\": \"DEVCON 2026\"}, \"name\": \"DEVCON2026\"}" \
		--header "Content-Type: application/json" \
		--request POST \
		--url "${DXP_URL}/o/object-admin/v1.0/object-folders" \
	| jq '{folder: .externalReferenceCode}'
fi

EXISTING=$(
	call \
		--data-urlencode "filter=name eq '$(jq --raw-output '.name' "${DEFINITION_FILE}")'" \
		--get \
		--url "${DXP_URL}/o/object-admin/v1.0/object-definitions" \
	| jq '.items[0] // empty'
)

if [ -n "${EXISTING}" ]
then
	if [ "$(echo "${EXISTING}" | jq --raw-output '.objectFolderExternalReferenceCode')" != "${FOLDER_ERC}" ]
	then
		EXISTING=$(
			call \
				--data "{\"objectFolderExternalReferenceCode\": \"${FOLDER_ERC}\"}" \
				--header "Content-Type: application/json" \
				--request PATCH \
				--url "${DXP_URL}/o/object-admin/v1.0/object-definitions/$(echo "${EXISTING}" | jq '.id')"
		)

		echo "Moved the object definition into the ${FOLDER_ERC} folder."
	fi

	echo "${EXISTING}" | jq '{id, name, objectFolderExternalReferenceCode, restContextPath, status: .status.label}'

	echo "The object definition already exists."

	exit 0
fi

ID=$(
	call \
		--data "@${DEFINITION_FILE}" \
		--header "Content-Type: application/json" \
		--request POST \
		--url "${DXP_URL}/o/object-admin/v1.0/object-definitions" \
	| jq --exit-status '.id'
)

call \
	--request POST \
	--url "${DXP_URL}/o/object-admin/v1.0/object-definitions/${ID}/publish" \
| jq '{id, name, objectFolderExternalReferenceCode, restContextPath, status: .status.label}'
