#!/usr/bin/env bash
AGY_ROOT="$(cd -- "$(dirname -- "$0")" && pwd)"
if ! bash "$AGY_ROOT/start.sh" install; then
  printf '\n%s\n' '安装未完成。请保留上面的错误信息。'
  read -r -p '按回车退出…' _
  exit 1
fi
