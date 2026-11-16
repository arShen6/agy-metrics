#!/usr/bin/env bash
export TOKEN_TIPS_LANGUAGE=zh-CN
AGY_ROOT="$(cd -- "$(dirname -- "$0")" && pwd)"
exec bash "$AGY_ROOT/install.command"
