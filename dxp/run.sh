#!/bin/bash

# Creates the frozen DEVCON DXP container. Run it once; afterwards use
# "docker start devcon-dxp" and "docker stop devcon-dxp". See README.md.

set -o errexit
set -o nounset
set -o pipefail

DXP_HOME="${DXP_HOME:-${HOME}/dev/projects/devcon-2026/liferay-portal}"
DXP_IMAGE="${DXP_IMAGE:-liferay/dxp:2026.q3.5-d10.0.88-20260924085907}"
DXP_PORT="${DXP_PORT:-8081}"

if docker container inspect devcon-dxp > /dev/null 2>&1
then
	echo "The devcon-dxp container already exists. Use \"docker start devcon-dxp\"."

	exit 1
fi

mkdir -p "${DXP_HOME}/data" "${DXP_HOME}/deploy"

# Rootless Docker maps the container's liferay user (uid 1000) to a subordinate
# host uid, so the bind-mounted folders must be owned by uid 1000 as seen from
# inside a container.

docker run \
	--rm \
	--volume "${DXP_HOME}:/devcon" \
	alpine chown 1000:1000 /devcon/data /devcon/deploy

docker run \
	--detach \
	--env 'LIFERAY_VIRTUAL_PERIOD_HOSTS_PERIOD_VALID_PERIOD_HOSTS=localhost,127.0.0.1,[::1],devcon.localhost' \
	--name devcon-dxp \
	--publish "${DXP_PORT}:8080" \
	--volume "${DXP_HOME}/data:/opt/liferay/data:Z" \
	--volume "${DXP_HOME}/deploy:/mnt/liferay/deploy:Z" \
	"${DXP_IMAGE}"

echo "Booting. Open http://devcon.localhost:${DXP_PORT} once \"Server startup in\" shows up in \"docker logs devcon-dxp\"."
