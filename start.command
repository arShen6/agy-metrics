#!/usr/bin/env bash
set -euo pipefail
AGY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$AGY_ROOT/start.sh" start --launch "$@"
