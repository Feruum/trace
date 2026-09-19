#!/bin/sh
set -e

# Frontend entrypoint script.
# The wrapper injects runtime config before starting Next.js.

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

exec env bun server-wrapper.js
