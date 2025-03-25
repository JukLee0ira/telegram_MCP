# Telegram MCP Server

A Model Context Protocol (MCP) server allows Large Language Models (LLMs) to interact with Telegram chats. It enables them to send and read messages through the Telegram API. With this server, LLMs like Claude can directly interact with Telegram chats while ensuring user control and security.

## Features

- Send messages to Telegram chats.
- Read recent messages from chats.
- Complete error handling and validation mechanisms.

## Prerequisites

- Node.js version 16.x or higher.
- Telegram Bot Token (obtain from @BotFather).
- Ensure the bot has joined the groups you want to interact with and has admin permissions.

## Installation Setup

1. Clone the repository:

```bash
git clone https://github.com/JukLee0ira/telegram_MCP.git
cd telegram_MCP
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory and fill in your bot_token here:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

4. Build the server:

```bash
npm run build
```

## Integration with Cursor

1. Add the following MCP server configuration in the `.cursor\mcp.json` file and save it:

```json
{
  "mcpServers": {
    "telegram": {
      "command": "cmd",
      "args": ["/c", "node", "C:/Users/tmp29/telegram_mcp/dist/telegram.js"]
    }
  }
}
```

2. Restart Cursor.

## Available Tools

### send-message

Send a message to a specified Telegram chat.

Parameters:

- `chat`: Group name
- `message`: The content of the message to send

Example:

```json
{
  "chat": "general",
  "message": "Greetings from MCP!"
}
```

### read-messages

Read the recent messages from a specified chat.

Parameters:

- `chat`: Group name
- `limit` (optional): Number of messages to retrieve (default: 50, maximum: 1000)

Example:

```json
{
  "chat_id": "general",
  "limit": 10
}
```

## Testing

Use MCP Inspector to test the server:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Usage Examples

Here are some interaction examples you can try after setting up the Telegram MCP server:

1. "Can you read the last 5 messages with @username?"
2. "Please send the message 'The meeting will start in 10 minutes' in the group."
3. "Check the recent discussions in the development channel about the latest version."

Cursor will use the appropriate tools to interact with Telegram and will ask for your consent before sending any messages.

## Safety Notes

- The bot needs proper Telegram permissions to run.
- All message sending operations require explicit user approval.
- Environment variables should be properly protected.
- Tokens should never be submitted to version control systems.
- Chat access is limited to chats authorized for the bot.

## Support

If you encounter problems or have questions:

1. Check the GitHub Issues section.
2. Refer to the MCP documentation: https://modelcontextprotocol.io
3. Provide detailed reproduction steps to create a new issue.
