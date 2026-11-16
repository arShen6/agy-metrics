# Contributing / 贡献指南

欢迎修复 AGY 兼容问题、改进中英文翻译和安装体验。请提交小而明确的 PR，说明问题、修改后的行为、验证方式、应用/系统版本。

- 运行 `npm test`；界面改动请使用 `npm run demo`，并附实机显示证据。
- 不上传会话数据库、聊天正文、账户标识、API Key 或本地私有路径。
- 流式速度和端到端速度必须分开标注；缺失数据保留为空，不用文本长度伪造 token。
- 安装改动必须保留升级、卸载与失败回滚能力，不更改用户正在运行的任务。
- 其他客户端请先开 Issue 讨论独立适配；提供可验证的数据来源、计时定义、会话隔离和真实客户端截图。仅有测试夹具不等于已支持。

Please keep PRs focused and describe the problem, resulting behavior, validation, and tested app/OS versions. Run `npm test`; UI changes also need demo checks and live-client evidence. Never commit conversation databases, message text, account identifiers or credentials. Preserve unknown values instead of inventing tokens, label timing definitions clearly, and keep upgrades/uninstall/rollback safe. Proposals for additional clients are welcome, but fixture tests alone do not establish support.
