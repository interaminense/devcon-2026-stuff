#!/bin/bash

# Backs up or restores the frozen DEVCON DXP data folder.
#
# Usage:
#   backup.sh backup  [file]
#   backup.sh restore [file]
#
# The container is stopped while the data is read or written, and started
# again afterwards. The default file is devcon-dxp-data.tgz in DXP_HOME.

set -o errexit
set -o nounset
set -o pipefail

DXP_HOME="${DXP_HOME:-${HOME}/dev/projects/devcon-2026/liferay-portal}"

ACTION="${1:-}"
FILE="${2:-${DXP_HOME}/devcon-dxp-data.tgz}"

FILE_DIR="$(cd "$(dirname "${FILE}")" && pwd)"
FILE_NAME="$(basename "${FILE}")"

if [ "${ACTION}" != "backup" ] && [ "${ACTION}" != "restore" ]
then
	echo "Usage: ${0} backup|restore [file]"

	exit 1
fi

docker stop devcon-dxp > /dev/null

if [ "${ACTION}" == "backup" ]
then
	docker run \
		--rm \
		--volume "${DXP_HOME}/data:/data:ro" \
		--volume "${FILE_DIR}:/backup" \
		alpine tar --create --directory /data --file "/backup/${FILE_NAME}" --gzip .
else
	docker run \
		--rm \
		--volume "${DXP_HOME}/data:/data" \
		--volume "${FILE_DIR}:/backup:ro" \
		alpine sh -c "find /data -mindepth 1 -delete && tar --directory /data --extract --file /backup/${FILE_NAME} --gzip"
fi

docker start devcon-dxp > /dev/null

echo "${ACTION} done: ${FILE}"
