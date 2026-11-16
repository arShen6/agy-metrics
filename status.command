#!/usr/bin/env bash
AGY_ROOT="$(cd -- "$(dirname -- "$0")" && pwd)"
bash "$AGY_ROOT/start.sh" status
bash "$AGY_ROOT/start.sh" doctor
read -r -p '按回车退出…' _
