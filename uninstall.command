#!/usr/bin/env bash
AGY_ROOT="$(cd -- "$(dirname -- "$0")" && pwd)"
if ! bash "$AGY_ROOT/start.sh" uninstall; then
  read -r -p '卸载未完成，请保留错误信息。按回车退出…' _
  exit 1
fi
