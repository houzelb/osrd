#!/usr/bin/env bash

set -e

root_path=$(realpath "$(dirname "$0")"/..)

args=()
overlays=(-f "$root_path"/docker-compose.yml)
stop_parsing=''
for arg in "$@"; do
    if [ $stop_parsing = 1 ]; then
        args+=("$arg")
    elif [ "$arg" = "--host" ]; then
        overlays+=(-f "$root_path"/docker/docker-compose.host.yml)
    elif [ "$arg" = "--front" ]; then
        overlays+=(-f "$root_path"/docker/docker-compose.front-dev.yml)
    elif [ "$arg" = "--single-worker" ]; then
        overlays+=(-f "$root_path"/docker/docker-compose.single-worker.yml)
    elif [[ $arg = -- || $arg != -* ]]; then
        stop_parsing=1
        if [ "$arg" != -- ]; then
            args+=("$arg")
        fi
    else
        args+=("$arg")
    fi
done

set -- "${overlays[@]}" "${args[@]}"

docker compose "$@"
