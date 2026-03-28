#!/bin/sh
set -e

# Start collector
bun run apps/collector/src/index.ts &

# Start API
bun run apps/api/src/index.ts &

# Start nginx (foreground keeps the container alive)
nginx -g 'daemon off;'
