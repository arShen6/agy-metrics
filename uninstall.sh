#!/usr/bin/env bash
AGY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if ! bash "$AGY_ROOT/start.sh" uninstall "$@"; then
  printf '\n%s\n' 'Operation failed. Please keep the error above for your issue report.'
  if [ -t 0 ]; then read -r -p 'Press Enter to close…' _; fi
  exit 1
fi
