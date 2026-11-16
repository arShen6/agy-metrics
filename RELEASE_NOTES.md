# agy-token-tips v0.2.5

Token usage, context fill, generation speed and first-token wait in Antigravity Desktop.

**Download your platform and language → unzip → run the installer.** Node.js is included.

| Platform | Installer | Status |
| --- | --- | --- |
| macOS Apple Silicon | Double-click `install.command` | Existing integration |
| Windows x64 | Double-click `install.cmd` | Experimental |
| Linux x64 | Run `install.sh` | Experimental; systemd desktop session required |

Choose `en.zip` for English tooltips or `zh-CN.zip` for Chinese. The main README is English, with a separate Chinese guide.

Windows/Linux add login startup, status checks, uninstall, and an Antigravity launcher. For the first connection, save your work and quit Antigravity, then use `start-antigravity.cmd` or `start-antigravity.sh`. Installers do not close active tasks.

Windows/Linux receive basic automated tests, native service-script syntax checks and bundled-runtime/launcher smoke tests; live Antigravity UI behavior is not verified on these platforms. Please report compatibility problems in [Issues](https://github.com/arShen6/agy-token-tips/issues/new?template=bug_report.md), including app/OS version, architecture and redacted errors. Do not attach conversation databases.

Installers are unsigned. Reference client: Antigravity 2.32.1. Intel Mac and Windows/Linux ARM downloads are not included.
