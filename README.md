# AGY Token Tips

[English](README.en.md) · [下载安装包](https://github.com/arShen6/agy-metrics/releases/latest) · [反馈问题](https://github.com/arShen6/agy-metrics/issues)

在 **Antigravity Desktop 输入框底部**显示 token 速度、首字等待、上下文用量与输出数量。悬停查看本次调用和会话累计统计。

底部保持英文缩写；详情提供中文、英文两个版本。安装后后台运行，登录自动启动，终端可以关闭。

![AGY Token Tips 实机效果](assets/agy-preview.png)

*用户提供的早期版本实机截图。当前版本还会在详情中明确列出「底部速度」和「端到端速度」，避免把两种计时口径混淆。截图数字仅为示例。*

## 下载与双击安装

当前独立安装包面向 **macOS Apple Silicon（M 系列）**，内置 Node.js，无需另装 Node、npm 或 Python。参考兼容版本：**Antigravity 2.32.1**。

1. 在 [Releases](https://github.com/arShen6/agy-metrics/releases/latest) 下载 `agy-token-tips-0.2.2-macos-arm64-zh-CN.zip`（中文）或 `…-en.zip`（English）。不要选择 GitHub 自动生成的 `Source code` 作为独立安装包。
2. 完整解压，在解压目录双击 **`install.command`**。系统可能要求确认打开；本项目尚未进行 Apple 签名或公证。
3. 看到后台服务注册成功后关闭终端，在 Antigravity 打开已有对话。新对话完成一次模型调用后开始有数据。

安装不会关闭你的任务或修改 Antigravity 安装包。M 系列以外的机器可按下文从源码运行；本版没有为 Intel Mac、Windows 或 Linux 提供已验证的双击安装包。

**切换语言：** 双击 `install-zh.command` 或 `install-en.command`，更新同一个后台服务。底部格式始终为 `agy · tok/s · TTFT · Ctx · Out`。

## 数字是什么意思

| 指标 | 口径 |
| --- | --- |
| tok/s | 最近一次模型调用的输出 token ÷ 流式输出时长，不含首字等待 |
| TTFT | 本地元数据报告的等待时长 |
| Hold | 返回可能被缓冲时，显示等待时长，并将速度切换为含等待的端到端速度 |
| Ctx | 最近请求的未缓存输入＋缓存读取 / 元数据提供的上下文上限 |
| Out | 最近一次调用的输出 token 数 |
| 悬停详情 | 同口径底部速度、另列端到端速度、等待/输出耗时、思考与响应/工具输出、会话累计输入输出及缓存命中率 |

比如输出 1,971 token，等待 9.9 秒、输出 20.0 秒：底部流式速度约 **98.6 tok/s**，含等待的端到端速度约 **65.9 tok/s**。两者定义不同，详情会分别标注。

上下文达到 75% 为黄色、90% 为红色；这是用量提醒，不是报错。没有可靠数值时显示 `—`，不会用文本长度编造 token 数。数据可能在一次调用结束后才更新，不能当作账户账单或剩余额度。

## 工作方式与隐私

这是独立的本地界面补丁，**不是 VSIX 扩展**。它只读本地 `gen_metadata` 用量数据，通过本机调试连接在 Antigravity 界面内添加提示条。没有 npm 运行依赖，不上传聊天或指标，不需要 API Key。

macOS 安装位置保留为 `~/Library/Application Support/AGY Metrics`，使用当前用户的 LaunchAgent；安装到独立副本后可移动或删除原解压目录。沿用旧路径与服务名是为了兼容已有安装。

已核对的 Antigravity 2.32.1 提供动态本地调试端口。其他版本可能改变界面属性或数据库格式，届时需要适配。当前只发布 AGY 功能。

## 检查、升级与卸载

- **检查：** 双击 `status.command`。`ready: true` 表示检查到了真实窗口中的提示组件，只有端口连通不算成功。
- **升级：** 下载新版并重新运行安装器。安装器会等待旧服务完全退出后再注册新服务。
- **卸载：** 双击 `uninstall.command`，停止服务并移除登录启动项。保留版本备份和日志，不删除 Antigravity 会话。
- **日志：** `~/Library/Application Support/AGY Metrics/logs/`。

| 遇到的情况 | 处理 |
| --- | --- |
| 等待调用数据 | 完成一次模型调用，并稍候刷新 |
| 没有提示条 | 运行 `status.command`，确认应用版本和本地调试连接 |
| 数据库忙 | 自动重试，不需要删除数据库 |
| 格式不支持 | 提交应用版本、系统版本和脱敏错误；不要上传会话数据库 |

## 从源码运行

需要 **Node.js >=22.16**。macOS 启动器会查找已有 Node（含 Volta/NVM），不改变全局版本。

```bash
bash start.sh install                 # macOS 后台安装
bash start.sh start --language en     # 临时运行，Ctrl+C 停止
bash start.sh doctor                  # 只读诊断
npm test
npm run demo                         # 模拟数据预览，不是实机验证
```

Windows/Linux 可手动启动 Antigravity 的本地调试端口，再运行 `node bin/agy-metrics.mjs start --port 9222`。这些平台有路径测试，但未完成实机验收。详细配置与协议见 [protocol.md](docs/protocol.md)。

## 贡献与许可

欢迎通过 Issue / Pull Request 修复版本兼容性、改进翻译和安装体验。请先阅读 [贡献指南](CONTRIBUTING.md)。支持其他客户端的 PR 也欢迎讨论，但必须包含真实数据来源和实机验证，不能仅凭解析测试标记为支持。

功能灵感来自 [船板的 Antigravity 补丁](https://github.com/Anarcadia/chuanban-antigravity-theme-patch)。本项目独立实现数据读取、界面和启动器，未包含其主题、字体、汉化资源或代码。

[MIT License](LICENSE)。非 Google 官方项目。安装包附带的 Node.js 使用其自身许可，见 `runtime/LICENSE`。
