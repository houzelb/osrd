#!/bin/sh

# This script leverages the host override docker-compose file to run the OSRD stack.
# By design, this script is not meant to be run on Windows since it relies exclusively on network_mode: host.

set -e

# We override the default docker-compose file with "host" and "single-worker" versions in the docker folder

# From docker/docker-compose.single-worker.yml, profiles are provided:
# - no profile means all other services (except editoast and core)
# - `--profile "*"` means all services
# - `--profile with-editoast` means all other services and editoast
# - `--profile with-core` means all other services and core
docker compose \
    -p "osrd" \
    -f "docker-compose.yml" \
    -f "docker/docker-compose.host.yml" \
    -f "docker/docker-compose.single-worker.yml" \
    "$@"
