# agy-token-tips

[English](README.md) | [简体中文](README.zh-CN.md)

**See token usage, context fill, generation speed and first-token wait — right inside Antigravity Desktop.**

**Download → unzip → run the installer.** No separate Node.js installation required.

| Platform | English tooltips | Chinese tooltips | Installer |
| --- | --- | --- | --- |
| macOS · Apple Silicon | [Download](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-macos-arm64-en.zip) | [Download](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-macos-arm64-zh-CN.zip) | Double-click `install.command` |
| Windows · x64 (experimental) | [Download](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-windows-x64-en.zip) | [Download](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-windows-x64-zh-CN.zip) | Double-click `install.cmd` |
| Linux · x64 (experimental) | [Download](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-linux-x64-en.zip) | [Download](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-linux-x64-zh-CN.zip) | Run `install.sh` |

Reference client: **Antigravity 2.32.1**. Windows/Linux have basic automated checks, **not live-client verification**. Please [report issues](https://github.com/arShen6/agy-token-tips/issues/new?template=bug_report.md).

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

## Quick install

1. **Download your platform and language above.** Choose an installer ZIP, not GitHub's automatic “Source code” archive.
2. **Extract the entire ZIP**, then run the installer listed above. On Linux, choose **Run as a Program** in your file manager; if unavailable, run `bash install.sh` from that folder.
3. **Open an Antigravity conversation.** New conversations show data after their first model call.

For a first connection on Windows/Linux, save your work, quit Antigravity, then run **`start-antigravity.cmd` / `start-antigravity.sh`**. This opens Antigravity with local debugging enabled. Use that launcher again after a full app restart if the metrics disappear. The installer never closes active tasks.

The helper starts at login: LaunchAgent on macOS, a current-user scheduled task on Windows, or a user systemd service on Linux. **Linux needs a logged-in desktop session with systemd; Windows needs Task Scheduler and Windows PowerShell.** Install as your normal user.

| Action | macOS | Windows | Linux |
| --- | --- | --- | --- |
| English details | `install-en.command` | `install-en.cmd` | `install-en.sh` |
| Chinese details | `install-zh.command` | `install-zh.cmd` | `install-zh.sh` |
| Check status | `status.command` | `status.cmd` | `status.sh` |
| Uninstall | `uninstall.command` | `uninstall.cmd` | `uninstall.sh` |

These community installers are unsigned. Your OS or file manager may ask you to confirm opening them. Windows ARM, Linux ARM and Intel Mac standalone packages are not included in this release.

## Understand the numbers

**Streaming speed** excludes the initial wait. **End-to-end speed** includes it. Both are labeled separately in the tooltip, which repeats the same speed shown in the bar. Potentially buffered output uses end-to-end speed and the `Hold` label.

Counts come from local usage metadata. Unknown values stay `—`; tokens are not guessed from text length. These are conversation metrics, not billing or remaining account quota.

<details>
<summary>Technical details, troubleshooting and development</summary>

This is an unofficial local UI patch, not a VSIX extension. It reads local `gen_metadata` records and uses a loopback debugging connection to mount the strip. No API key or chat/metrics uploads. No application bundle modification.

macOS retains `~/Library/Application Support/AGY Metrics` and its LaunchAgent identity for upgrade compatibility. Windows installs under `%LOCALAPPDATA%/agy-token-tips`; Linux uses `$XDG_DATA_HOME/agy-token-tips` (normally `~/.local/share/agy-token-tips`). It installs an independent copy, so the downloaded folder can be moved afterward. Uninstall removes login startup and the service; logs and backups remain, and Antigravity conversations are untouched.

If metrics are missing, finish a model call and run the status script for your platform. `ready: true` means the widget was detected in an actual window. Logs are in the installation directory’s `logs` folder. Linux service diagnostics: `journalctl --user -u agy-token-tips.service -n 50`. Client updates may require adjustments to the private data format or UI hooks. Report your app/OS versions and redacted errors; do not upload conversation databases.

Source development requires Node.js >=22.16:

```bash
bash start.sh start --language en
bash start.sh doctor
npm test
npm run demo
```

The demo uses simulated data. Windows/Linux packages are experimental: automated tests and native runtime/launcher checks do not establish live UI compatibility. More details: [protocol.md](docs/protocol.md).

</details>

## Contribute

Issues and pull requests are welcome — compatibility fixes, translations and installation improvements. See [CONTRIBUTING.md](CONTRIBUTING.md). Proposals for other clients need verified data sources and live-client evidence.

Inspired by [chuanban-antigravity-theme-patch](https://github.com/Anarcadia/chuanban-antigravity-theme-patch). Independently implemented; no code or theme assets from that project are bundled. [MIT License](LICENSE). Unofficial, not affiliated with Google. Node.js retains its own license in `runtime/LICENSE`.
