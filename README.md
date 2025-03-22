# Telegram MCP Server

一个模型上下文协议(MCP)服务器，使 LLMs 能够与 Telegram 聊天进行交互，允许它们通过 Telegram API 发送和读取消息。使用此服务器，像 Claude 这样的 LLM 可以直接与 Telegram 聊天进行交互，同时保持用户控制和安全性。

## 功能特点

- 发送消息到 Telegram 聊天
- 从聊天中读取最近消息
- 支持私人聊天和群组聊天
- 完善的错误处理和验证机制

## 前置要求

- Node.js 16.x 或更高版本
- Telegram Bot Token (从 @BotFather 获取)
- 确保机器人具有以下权限：
  - 读取消息
  - 发送消息
  - 编辑消息
  - 删除消息（可选）

## 安装设置

1. 克隆仓库:

```bash
git clone https://github.com/yourusername/telegrammcp.git
cd telegrammcp
```

2. 安装依赖:

```bash
npm install
```

3. 在根目录创建 `.env` 文件:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

4. 构建服务器:

```bash
npm run build
```

## 与 Claude Desktop 集成

1. 打开 Claude Desktop 配置文件:

   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. 添加 Telegram MCP 服务器配置:

```json
{
  "mcpServers": {
    "telegram": {
      "command": "node",
      "args": ["path/to/telegrammcp/build/index.js"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "your_telegram_bot_token_here"
      }
    }
  }
}
```

3. 重启 Claude Desktop

## 可用工具

### send-message

发送消息到指定的 Telegram 聊天。

参数:

- `chat_id`: 聊天 ID（数字）或用户名（字符串）
- `message`: 要发送的消息内容
- `reply_to_message_id` (可选): 要回复的消息 ID

示例:

```json
{
  "chat_id": "@username",
  "message": "来自 MCP 的问候！"
}
```

### read-messages

读取指定聊天的最近消息。

参数:

- `chat_id`: 聊天 ID（数字）或用户名（字符串）
- `limit` (可选): 获取的消息数量（默认: 50, 最大: 100）

示例:

```json
{
  "chat_id": "-100123456789",
  "limit": 10
}
```

## 开发

1. 安装开发依赖:

```bash
npm install --save-dev typescript @types/node
```

2. 以开发模式启动服务器:

```bash
npm run dev
```

## 测试

使用 MCP Inspector 测试服务器:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## 使用示例

以下是一些可以在设置完 Telegram MCP 服务器后尝试的交互示例：

1. "能否读取与@username 的最后 5 条消息？"
2. "请在群组中发送消息'会议将在 10 分钟后开始'"
3. "查看开发频道关于最新版本的最近讨论"

Claude 将使用适当的工具与 Telegram 交互，并在发送任何消息前征求您的同意。

## 安全注意事项

- 机器人需要适当的 Telegram 权限才能运行
- 所有消息发送操作都需要明确的用户批准
- 环境变量应妥善保护
- Token 永远不要提交到版本控制系统
- 聊天访问仅限于机器人被授权的聊天

## 贡献指南

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m '添加某个很棒的功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 支持

如果遇到问题或有疑问：

1. 查看 GitHub Issues 区域
2. 查阅 MCP 文档：https://modelcontextprotocol.io
3. 提供详细复现步骤创建新的 issue
