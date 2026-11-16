# agy-token-tips

[English](README.md) | [简体中文](README.zh-CN.md)

**See token usage, context fill, generation speed and first-token wait — right inside Antigravity Desktop.**

[**Download for macOS · English**](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.4/agy-token-tips-0.2.4-macos-arm64-en.zip) · [**Chinese version**](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.4/agy-token-tips-0.2.4-macos-arm64-zh-CN.zip)

**Download → unzip → double-click `install.command`.** No commands to type, no separate runtime to install. Runs in the background after installation.

For **macOS Apple Silicon (M series)** · Reference client: **Antigravity 2.32.1**

![agy-token-tips showing speed, wait time, context usage and detailed statistics in Antigravity](assets/agy-preview.png)

*Preview from an earlier build. Current details explicitly distinguish streaming and end-to-end speed.*

## What you see

A compact bar beside your composer. Hover for the details — no separate dashboard to open.

| Metric | What it shows |
| --- | --- |
| **Ctx** | Context tokens used / limit, plus percentage |
| **tok/s** | Output speed of the latest model call |
| **TTFT / Hold** | First-token wait / wait for buffered output |
| **Out** | Output tokens in the latest call |
| **Hover details** | Reasoning and response/tool output, session totals |
| **Cache** | Cached input and cache hit rate |

Context usage turns **yellow at 75%** and **red at 90%**. The strip stays in English; tooltips are available in English or Chinese. Data may update after a model call completes.

## Install in 3 steps

1. **Download your language above.** Choose an installer ZIP, not GitHub's automatic “Source code” archive.
2. **Extract the whole ZIP, then double-click `install.command`.**
3. **Open an Antigravity conversation.** Once the service is registered, close Terminal. New conversations show data after their first model call.

The runtime is included. Starts at login and reconnects when Antigravity reopens. Installation leaves active tasks running.

| Action | Double-click |
| --- | --- |
| English details | `install-en.command` |
| Chinese details | `install-zh.command` |
| Check status | `status.command` |
| Uninstall | `uninstall.command` |

macOS may ask you to confirm opening the installer; it is not Apple-signed or notarized. Standalone downloads currently target M-series Macs.

## Understand the numbers

**Streaming speed** excludes the initial wait. **End-to-end speed** includes it. Both are labeled separately in the tooltip, which repeats the same speed shown in the bar. Potentially buffered output uses end-to-end speed and the `Hold` label.

Counts come from local usage metadata. Unknown values stay `—`; tokens are not guessed from text length. These are conversation metrics, not billing or remaining account quota.

<details>
<summary>Technical details, troubleshooting and development</summary>

This is an unofficial local UI patch, not a VSIX extension. It reads local `gen_metadata` records and uses a loopback debugging connection to mount the strip. No API key or chat/metrics uploads. No application bundle modification.

The installer keeps the existing `~/Library/Application Support/AGY Metrics` location and LaunchAgent identity for upgrade compatibility. It installs an independent copy, so the downloaded folder can be moved afterward. Uninstall removes login startup and the service; logs and backups remain, and Antigravity conversations are untouched.

If metrics are missing, finish a model call and run `status.command`. `ready: true` means the widget was detected in an actual window. Logs are in `~/Library/Application Support/AGY Metrics/logs/`. Client updates may require adjustments to the private data format or UI hooks. Report your app/OS versions and redacted errors; do not upload conversation databases.

Source development requires Node.js >=22.16:

```bash
bash start.sh start --language en
bash start.sh doctor
npm test
npm run demo
```

The demo uses simulated data. Windows/Linux have source-level path tests but no verified standalone installer or live UI support. More details: [protocol.md](docs/protocol.md).

</details>

## Contribute

Issues and pull requests are welcome — compatibility fixes, translations and installation improvements. See [CONTRIBUTING.md](CONTRIBUTING.md). Proposals for other clients need verified data sources and live-client evidence.

Inspired by [chuanban-antigravity-theme-patch](https://github.com/Anarcadia/chuanban-antigravity-theme-patch). Independently implemented; no code or theme assets from that project are bundled. [MIT License](LICENSE). Unofficial, not affiliated with Google. Node.js retains its own license in `runtime/LICENSE`.
