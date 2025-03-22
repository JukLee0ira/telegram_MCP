import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Bot, Context, GrammyError, HttpError } from "grammy";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { config } from "dotenv";
import { HttpsProxyAgent } from "https-proxy-agent";

config();

// define the message interface
interface TelegramMessage {
  chat: string;
  author: string;
  content: string;
  timestamp: string;
}
const proxy = process.env.PROXY_URL;
const telegramToken: string = process.env.TELEGRAM_TOKEN || "";
const proxyAgent = new HttpsProxyAgent(proxy || "");

const bot = new Bot<Context>(telegramToken, {
  client: {
    baseFetchConfig: {
      agent: proxyAgent,
    },
  },
});

// modify the findChat function
async function findChat(chatIdentifier: string): Promise<number> {
  try {
    const chatId = parseInt(chatIdentifier);
    if (!isNaN(chatId)) {
      return chatId;
    }

    //  try to find by group name
    const lowerCaseName = chatIdentifier.toLowerCase();
    const cachedId = groupCache.get(lowerCaseName);

    if (cachedId) {
      return cachedId;
    }

    // if not find the corresponding group, list all available groups
    const availableGroups = Array.from(groupCache.entries())
      .map(([name, id]) => `"${name}" (ID: ${id})`)
      .join(", ");

    throw new Error(
      `can't find the group "${chatIdentifier}".\n` +
        `available groups: ${availableGroups || "no groups recorded"}\n` +
        `hint: please ensure the robot has received messages in the target group, or use the group ID directly.`
    );
  } catch (error: any) {
    throw new Error(`can't find the group: ${error.message}`);
  }
}

// validate the schema
const SendMessageSchema = z.object({
  chat: z.string().describe("chat ID"),
  message: z.string().describe("message content"),
});

const ReadMessagesSchema = z.object({
  chat: z.string().describe("chat ID"),
  limit: z.number().min(1).max(100).default(50).describe("message number"),
});

// create the MCP server instance
const server = new Server(
  {
    name: "telegram",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "send-message",
        description: "send message to Telegram chat",
        inputSchema: {
          type: "object",
          properties: {
            chat: {
              type: "string",
              description: "group name",
            },
            message: {
              type: "string",
              description: "message content",
            },
          },
          required: ["chat", "message"],
        },
      },
      {
        name: "read-messages",
        description: "read the latest messages in Telegram chat",
        inputSchema: {
          type: "object",
          properties: {
            chat: {
              type: "string",
              description: "group name",
            },
            limit: {
              type: "number",
              description: "message number (max 100)",
              default: 50,
            },
          },
          required: ["chat"],
        },
      },
    ],
  };
});

// handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "send-message": {
        const { chat: chatIdentifier, message } = SendMessageSchema.parse(args);
        const chatId = await findChat(chatIdentifier);
        const sent = await bot.api.sendMessage(chatId, message);
        return {
          content: [
            {
              type: "text",
              text: `message sent successfully! message ID: ${sent.message_id}`,
            },
          ],
        };
      }

      case "read-messages": {
        const { chat: chatIdentifier, limit } = ReadMessagesSchema.parse(args);
        const chatId = await findChat(chatIdentifier);

        // get the messages from the cache
        const cachedMessages = Array.from(messageCache.values())
          .filter((msg) => msg.chat.id === chatId)
          .sort((a, b) => b.date - a.date) // 按时间降序排序
          .slice(0, limit); // 限制返回数量

        // convert to TelegramMessage format
        const messages = cachedMessages.map((msg) => ({
          chat: msg.chat.title,
          author: msg.fromUser.firstName || "anonymous",
          content: msg.text,
          timestamp: new Date(msg.date * 1000).toISOString(),
        }));

        return {
          content: [
            {
              type: "text",
              text: `successfully get ${
                messages.length
              } messages:\n${JSON.stringify(messages, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `invalid parameters: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`
      );
    }
    throw error;
  }
});

// error handling middleware
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(
    `error occurred while processing update ${ctx.update.update_id}:`
  );
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Telegram API error:", e.description);
  } else if (e instanceof HttpError) {
    console.error("network error:", e);
  } else {
    console.error("unknown error:", e);
  }
});

// message processing function, for getting the sender's name
function getUserName(msg: any) {
  if (msg.from?.username === "Channel_Bot" && msg.from?.is_bot) {
    return msg.sender_chat.title as string;
  }
  return (msg.from?.first_name as string) || "anonymous";
}

// create a Map to store the corresponding relationship between group name and ID
const groupCache = new Map<string, number>(); //TODO:进行群组持久化处理
// update the group cache
function updateGroupCache(chatId: number, chatName: string) {
  if (chatName) {
    groupCache.set(chatName.toLowerCase(), chatId);
  }
}

// define the message cache interface
interface CachedMessage {
  messageId: number;
  fromUser: {
    id: number;
    firstName: string;
    lastName?: string;
    username?: string;
  };
  chat: {
    id: number;
    title: string;
    type: string;
  };
  date: number;
  text: string;
}

// create a message cache Map, key is the message ID, value is the message content
const messageCache = new Map<number, CachedMessage>();

// define the cache size limit
const MAX_CACHE_SIZE = 1000;

// function for adding message to the cache
function addMessageToCache(msg: any) {
  // if the cache reaches the limit, delete the oldest message
  if (messageCache.size >= MAX_CACHE_SIZE) {
    const firstKey = messageCache.keys().next().value;
    if (firstKey !== undefined) {
      messageCache.delete(firstKey);
    }
  }

  // build the cache message object
  const cachedMessage: CachedMessage = {
    messageId: msg.message_id,
    fromUser: {
      id: msg.from.id,
      firstName: msg.from.first_name,
      lastName: msg.from.last_name,
      username: msg.from.username,
    },
    chat: {
      id: msg.chat.id,
      title: msg.chat.title,
      type: msg.chat.type,
    },
    date: msg.date || Math.floor(Date.now() / 1000), // 如果 msg.date 未定义，使用当前时间戳
    text: msg.text || "",
  };

  // add the message to the cache
  messageCache.set(msg.message_id, cachedMessage);
}

// add the cache logic in the message processing function
bot.on("message", async (ctx) => {
  if (!ctx.message.chat.type.includes("group")) {
    await ctx.reply("I am a group robot, please add me to the group to use.");
    return;
  }
  const msg = ctx.message;
  const groupId = msg.chat.id;
  const groupName = msg.chat.title || "anonymous";
  // update the group cache
  updateGroupCache(groupId, groupName);
  addMessageToCache(msg);
});

// start the server
async function main() {
  // check the Telegram token
  const token = telegramToken;
  if (!token) {
    throw new Error("TELEGRAM_TOKEN is not set");
  }

  try {
    // start the bot
    await bot.init();
    console.error("Telegram bot is ready!");

    // start the MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Telegram MCP server is running via stdio");
    await bot.start({});
  } catch (error) {
    console.error("fatal error in main():", error);
    process.exit(1);
  }
}
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());

main();
