#!/usr/bin/env bash
set -euo pipefail
AGY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
AGY_NODE=""
agy_supported_node() {
  [ -x "$1" ] && "$1" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=16)?0:1)' >/dev/null 2>&1
}
for candidate in "${AGY_NODE_BIN:-}" "$AGY_ROOT/runtime/node" "$(command -v node || true)" /opt/homebrew/opt/node@22/bin/node /usr/local/opt/node@22/bin/node /opt/homebrew/bin/node /usr/local/bin/node "$HOME"/.volta/tools/image/node/*/bin/node "$HOME"/.nvm/versions/node/*/bin/node; do
  if agy_supported_node "$candidate"; then AGY_NODE="$candidate"; break; fi
done
if [ -z "$AGY_NODE" ]; then
  printf '%s\n' 'tokens-tips requires Node.js >=22.16. Use a standalone download or install Node 22/24 LTS.' 'tokens-tips 需要 Node.js >=22.16。请使用内置运行环境的安装包，或安装 Node 22/24 LTS。' >&2
  exit 1
fi
if [ "$#" -eq 0 ]; then set -- start; fi
case "$1" in
  install|uninstall|status) exec "$AGY_NODE" "$AGY_ROOT/bin/desktop.mjs" "$@" ;;
esac
exec "$AGY_NODE" "$AGY_ROOT/bin/agy-metrics.mjs" "$@"
