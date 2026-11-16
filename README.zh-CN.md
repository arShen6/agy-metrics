# agy-token-tips

[English](README.md) | [简体中文](README.zh-CN.md)

**在 Antigravity 输入框旁，直接查看 token 用量、上下文占用、生成速度和首字等待时间。**

**下载 → 完整解压 → 运行安装器。** 已内置运行环境，不需要另装 Node.js。

| 平台 | 中文解释版 | 英文解释版 | 安装入口 |
| --- | --- | --- | --- |
| macOS · M 系列 | [下载](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-macos-arm64-zh-CN.zip) | [下载](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-macos-arm64-en.zip) | 双击 `install.command` |
| Windows · x64（实验版） | [下载](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-windows-x64-zh-CN.zip) | [下载](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-windows-x64-en.zip) | 双击 `install.cmd` |
| Linux · x64（实验版） | [下载](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-linux-x64-zh-CN.zip) | [下载](https://github.com/arShen6/agy-token-tips/releases/download/v0.2.5/agy-token-tips-0.2.5-linux-x64-en.zip) | 运行 `install.sh` |

参考客户端：**Antigravity 2.32.1**。Windows/Linux 完成基础自动化检查，**尚未经客户端实机验收**；遇到问题欢迎 [提交 Issue](https://github.com/arShen6/agy-token-tips/issues/new?template=bug_report.md)。

![agy-token-tips 在 Antigravity 中显示速度、等待时间、上下文用量和详细统计](assets/agy-preview.png)

*早期版本实机示例；当前详情已明确区分流式速度与端到端速度。*

## 可以看到什么

输入框旁直接看关键指标，鼠标悬停展开详情，无需打开其他面板。

| 指标 | 展示内容 |
| --- | --- |
| **Ctx** | 上下文已用 token / 上限与占比 |
| **tok/s** | 最近一次模型调用的输出速度 |
| **TTFT / Hold** | 首字等待 / 缓冲返回等待时间 |
| **Out** | 本次输出 token 数 |
| **悬停详情** | 思考与响应/工具输出、会话累计用量 |
| **缓存** | 缓存读取量与命中率 |

上下文占用达到 **75% 变黄、90% 变红**。底部统一英文缩写，详细解释可选中英文；数据可能在单次调用完成后更新。

## 快速安装

1. **下载对应平台和语言的安装包。** 不要选择 GitHub 自动生成的 `Source code` 源码包。
2. **完整解压**，运行上表中的安装器。Linux 可在文件管理器中选择“作为程序运行”；没有此选项时，在解压目录运行 `bash install.sh`。
3. **打开 Antigravity 对话**，新对话完成首次调用后开始显示。

Windows/Linux 首次连接时，请先保存工作并退出 Antigravity，然后运行 **`start-antigravity.cmd` / `start-antigravity.sh`**，以开启本地调试连接。完全退出应用后如果指标消失，再通过此启动器打开即可。安装器不会关闭正在运行的任务。

后台服务会在登录后自动运行：macOS 使用 LaunchAgent，Windows 使用当前用户的计划任务，Linux 使用用户级 systemd 服务。**Linux 需要已登录的桌面会话和 systemd；Windows 需要任务计划程序及 Windows PowerShell。** 使用普通用户安装即可。

| 操作 | macOS | Windows | Linux |
| --- | --- | --- | --- |
| 中文解释 | `install-zh.command` | `install-zh.cmd` | `install-zh.sh` |
| 英文解释 | `install-en.command` | `install-en.cmd` | `install-en.sh` |
| 检查状态 | `status.command` | `status.cmd` | `status.sh` |
| 卸载 | `uninstall.command` | `uninstall.cmd` | `uninstall.sh` |

安装器没有进行平台签名，首次运行可能需要系统或文件管理器确认。本次不提供 Windows ARM、Linux ARM、Intel Mac 的独立安装包。

## 理解这些数字

**流式速度不含等待，端到端速度包含等待。** 详情分别标注，并重复展示底部相同口径的速度；可能被缓冲的返回使用端到端速度和 `Hold` 标记。

数字来自本地用量数据，未知项显示 `—`，不按文本长度猜测 token；这些是会话指标，不代表账单或账户剩余额度。

<details>
<summary>技术说明、排查与开发</summary>

这是非官方的本地界面补丁，不是 VSIX 扩展。只读本地 `gen_metadata` 用量数据，通过本机调试连接添加提示条，不上传聊天或指标，不需要 API Key，也不修改应用安装包。

macOS 保留旧安装目录和服务标识：`~/Library/Application Support/AGY Metrics`。Windows 使用 `%LOCALAPPDATA%/agy-token-tips`；Linux 使用 `$XDG_DATA_HOME/agy-token-tips`，默认是 `~/.local/share/agy-token-tips`。安装器保存独立副本，之后可以移动下载目录。卸载会停止服务并移除登录启动项，保留日志和版本备份，不删除 Antigravity 会话。

无显示时先完成一次调用，再运行对应平台的状态脚本。`ready: true` 表示检查到了实际窗口中的组件。日志在安装目录的 `logs` 子目录；Linux 服务诊断可运行 `journalctl --user -u agy-token-tips.service -n 50`。客户端升级可能改变内部数据格式或界面属性；反馈时请附版本和脱敏错误，不要上传会话数据库。

从源码开发需要 Node.js >=22.16：

```bash
bash start.sh start --language zh-CN
bash start.sh doctor
npm test
npm run demo
```

预览使用模拟数据。Windows/Linux 仍属实验版；自动化测试和运行环境、启动脚本检查不等于客户端实机兼容性验收。详见 [协议说明](docs/protocol.md)。

</details>

## 参与贡献

欢迎提 Issue / PR，共同改进兼容性、翻译和安装体验，详见 [贡献指南](CONTRIBUTING.md)。其他客户端的适配需提供真实数据来源与实机验证。

灵感来自 [船板的 Antigravity 补丁](https://github.com/Anarcadia/chuanban-antigravity-theme-patch)。本项目独立实现，未包含该项目的代码或主题资源。采用 [MIT 许可](LICENSE)，非 Google 官方项目。内置 Node.js 使用其自身许可，见 `runtime/LICENSE`。
