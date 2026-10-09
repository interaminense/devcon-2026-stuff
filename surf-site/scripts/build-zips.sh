#!/usr/bin/env bash

set -euo pipefail

SURF_SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DIST_DIR="${SURF_SITE_DIR}/dist"

rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

cd "${SURF_SITE_DIR}/src"

zip --quiet --recurse-paths "${DIST_DIR}/swell-lab-fragments.zip" fragments
zip --quiet --recurse-paths "${DIST_DIR}/swell-lab-pages.zip" master-pages page-templates
zip --quiet --recurse-paths "${DIST_DIR}/swell-lab-style-book.zip" style-books

ls -l "${DIST_DIR}"
