#!/usr/bin/env bash
AGY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
bash "$AGY_ROOT/start.sh" status
bash "$AGY_ROOT/start.sh" doctor
printf '%s\n' 'Linux service logs: journalctl --user -u agy-token-tips.service -n 50'
if [ -t 0 ]; then read -r -p 'Press Enter to close…' _; fi
