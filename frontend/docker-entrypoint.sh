#!/bin/sh
set -e

printf '\n========================================\n'
printf ' Frontend dashboard: http://localhost:%s\n' "${HOST_PORT:-8080}"
printf '========================================\n\n'

exec "$@"
