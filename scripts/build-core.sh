#!/bin/sh

set -x

docker compose \
    -p "osrd" \
    -f "docker-compose.yml" \
    build core
