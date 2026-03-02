# Notion ORM

A lightweight TypeScript [Notion API](https://developers.notion.com/) wrapper that aims to improve interactions with databases and custom agents, by leveraging static schema types

## Key Features
- Sync remote schema changes in single command
- Easily interact with your custom agents (ex. chat, streaming)
- Intellisense when adding and querying
- Exposed database metadata (ex. types, zod validators)

## Basic examples
### Add page to database

```ts
await notion.databases.books.add({
  icon: {
    type: "emoji",
    emoji: "📕",
  },
  // Expected `properties` object's keys and values are typed to `book` database schema
  properties: {
    bookName: "Creativity, Inc.",
    genre: ["Non-fiction"],
    publishDate: {
      start: "2026-03-01",
    },
  },
});

```

### Query/filter database

```ts
const response = await notion.databases.books.query({
  // Expected `filter` object is typed to the `book` database schema
  filter: {
    and: [
      { genre: { contains: "Non-fiction" } },
      { publishDate: { on_or_after: "2026-01-01" } },
      {
        or: [
          { bookName: { contains: "Creativity" } },
          { bookName: { contains: "Innovation" } },
        ],
      },
    ],
  },
});

```

### Chat with agent
```ts
const chat = await notion.agents.helpBot.chat({message: "Is the company closed today"})
await notion.agents.helpBot.pollThread(chat.threadId)
const messages = await notion.agents.helpBot.getMessages(chat.threadId, {
  role: "agent",
});
```


### Chat with agent (stream)

```ts
const thread = await notion.agents.helpBot.chatStream({
  message: "How can I update my shipping address?",
  onMessage: ({content, role}) => (msg.content),
});

```


# Installation

You need a Notion integration key. Add shared data source IDs only if you want generated database clients.

```bash
bun add @haustle/notion-orm
```

## Quickstart

Initialize config from your project root (recommended):

```bash
bun notion init
```

If needed, you can force config format:

```bash
bun notion init --ts
# or
bun notion init --js
```

Generated config shape:

```ts
// notion.config.ts
// Be sure to create a .env.local file and add your NOTION_KEY

// If you don't have an API key, sign up for free
// [here](https://developers.notion.com)

const auth = process.env.NOTION_KEY || "your-notion-api-key-here";
const NotionConfig = {
  auth,
  databases: [
    // Use: notion add <database-id>
  ],
  agents: [
    // Auto-populated by: notion sync
  ],
};

export default NotionConfig;
```

### Adding databases

To add a new database fetch the datasource ID and run the following

```bash
bun notion add <database-id>
```

Automatically builds related types and updates config (a following `sync` is not required).

### Adding agents
`agents` linked to the integration are automatically populated when running `bun notion sync` (no manual edits needed). If you only care about agents, you're done setting up!


### Full sync command (`notion sync`)

Use `bun notion sync` as the full sync command when you want to refresh everything from your integration in one run (database schemas + custom agents).

```bash
bun notion sync
```

`notion sync` creates and refreshes:

- `build/db/*` generated database clients/types
- `build/agents/*` generated agent clients/types
- `build/src/index.*` generated package entry that wires both groups into `NotionORM`

# Implementation

Generated database and agent names are camelCased and exposed on an instance of `NotionORM`.

```ts
import NotionORM from "@haustle/notion-orm";

const notion = new NotionORM({
  auth: process.env.NOTION_KEY!,
});

await notion.databases.menuRecipes.query({});
await notion.agents.yourAgentName.listThreads();
```

## Public client

### Runtime shape

```ts
const db = notion.databases.books; // DatabaseClient
const agent = notion.agents.yourAgentName; // AgentClient
```

### Runtime access


| runtime property   | type                             | description                                                    | go deeper                                                            |
| ------------------ | -------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| `notion.databases` | `Record<string, DatabaseClient>` | Generated database client map keyed by camelCase database name | [Adding](#adding), [Querying](#querying)                             |
| `notion.agents`    | `Record<string, AgentClient>`    | Generated agent client map keyed by camelCase agent name       | [Agents](#agents), [Agent method reference](#agent-method-reference) |


### Database client (public methods)


| member                       | kind     | description                                                   | go deeper                                                                              |
| ---------------------------- | -------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `id`                         | property | Notion data source ID used by this client instance            | -                                                                                      |
| `name`                       | property | Human-readable database name captured during generation       | -                                                                                      |
| `add({ properties, icon? })` | method   | Creates a page in the database using typed `properties`       | [Adding](#adding)                                                                      |
| `query({ filter?, sort? })`  | method   | Queries database pages and returns `{ results, rawResponse }` | [Querying](#querying), [Supported database properties](#supported-database-properties) |


### Agent client (public methods)


| member                                           | kind     | description                                           | go deeper                                                            |
| ------------------------------------------------ | -------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `id`                                             | property | Notion agent ID used by this client instance          | -                                                                    |
| `name`                                           | property | Human-readable agent name                             | -                                                                    |
| `icon`                                           | property | Normalized agent icon metadata (or `null`)            | -                                                                    |
| `listThreads()`                                  | method   | Lists recent threads with `id`, `title`, and `status` | [Agent method reference](#agent-method-reference)                    |
| `getThreadInfo(threadId)`                        | method   | Fetches a single thread record                        | [Agent method reference](#agent-method-reference)                    |
| `getThreadTitle(threadId)`                       | method   | Convenience helper to fetch just the thread title     | [Agent method reference](#agent-method-reference)                    |
| `chat({ message, threadId? })`                   | method   | Sends a message and creates/resumes a thread          | [Agents](#agents), [Agent method reference](#agent-method-reference) |
| `chatStream({ message, threadId?, onMessage? })` | method   | Streams messages and returns final `ThreadInfo`       | [Agents](#agents), [Agent method reference](#agent-method-reference) |
| `getMessages(threadId, { role? })`               | method   | Gets full (or role-filtered) message history          | [Agent method reference](#agent-method-reference)                    |
| `pollThread(threadId, options?)`                 | method   | Polls until thread processing completes               | [Agent method reference](#agent-method-reference)                    |


### Generated exports


| import path                                    | what you get                                                                                                                                                                 | when to use                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `@haustle/notion-orm/build/db/<databaseName>`  | `<databaseName>(auth)` factory, `DatabaseSchemaType`, `QuerySchemaType`, generated Zod schema, generated option tuples (for select/status/multi-select), schema/type aliases | Script-level direct DB usage without the `NotionORM` wrapper |
| `@haustle/notion-orm/build/agents/<agentName>` | `<agentName>(auth)` factory that returns an `AgentClient`                                                                                                                    | Script-level direct agent usage                              |
| `@haustle/notion-orm/build/db`                 | `databases` barrel object (all database factories)                                                                                                                           | Dynamic database selection or custom registry wiring         |
| `@haustle/notion-orm/build/agents`             | `agents` barrel object (all agent factories)                                                                                                                                 | Dynamic agent selection or custom registry wiring            |


If you need the final plain-text agent response from stream output, import `AgentClient` from `@haustle/notion-orm` and use `AgentClient.getAgentResponse(threadInfo)`.

# Available database operations

## Adding

Only title is required by Notion for a minimal page.

```ts
await notion.databases.books.add({
  properties: {
    bookName: "Raphael, Painter in Rome: a Novel", // title
    author: "Stephanie Storey", // rich_text
    status: "In progress", // status
    numberOfPages: 307, // number
    genre: ["Historical Fiction"], // multi_select
    startDate: {
      start: "2023-01-01",
    }, // date
    phone: "0000000000", // phone_number
    email: "tyrus@haustle.studio", // email
  },
});
```

## Querying

Query filters are typed by your generated schema, including nested compound filters. Find Notion filter operators [here](https://developers.notion.com/reference/post-database-query-filter).

Example single filter:

```ts
await notion.databases.books.query({
  filter: {
    genre: {
      contains: "Sci-Fi",
    },
  },
  sort: [
    {
      property: "Book Name",
      direction: "ascending",
    },
  ],
});
```

Example compound filters:

```ts
await notion.databases.books.query({
  filter: {
    and: [
      {
        or: [
          { genre: { contains: "Sci-Fi" } },
          { genre: { contains: "Biography" } },
        ],
      },
      { numberOfPages: { greater_than: 250 } },
    ],
  },
});
```

Successful query shape:

```ts
{
  rawResponse: { /* full Notion API response */ },
  results: [
    {
      bookName: "How to Change Your Mind",
      genre: ["Non-fiction"],
      numberOfPages: 460,
    },
  ],
}
```

### Agents

Agents are generated from those shared with your integration and exposed at `notion.agents.*`.

#### Basic chat (non-streaming)

- Useful when you want a straightforward request/response flow.
- Helpful when you plan to fetch message history after completion.

```ts
const chat = await notion.agents.yourAgentName.chat({
  message: "Create a 5-day high-protein meal plan.",
});

await notion.agents.yourAgentName.pollThread(chat.threadId);

const messages = await notion.agents.yourAgentName.getMessages(chat.threadId, {
  role: "agent",
});
```

#### Continue an existing thread

- Useful when you want to preserve context across follow-up prompts.
- Helpful for chat UIs where users continue the same conversation.

```ts
const nextTurn = await notion.agents.yourAgentName.chat({
  threadId: chat.threadId,
  message: "Now turn that into a grocery list.",
});
```

#### Streaming patterns

##### Resume old chat stream

- Useful when you want to continue a streamed conversation with additional context.
- Helpful for resuming after a page refresh or when the user returns to an existing thread.

```ts
const previousThreadId = "1f4e6f4a-5b58-4d91-a7fc-2f5f2a0f6bb1"; // from listThreads() or prior chatStream

const thread = await notion.agents.yourAgentName.chatStream({
  threadId: previousThreadId,
  message: "Add a 6th day to that meal plan.",
  onMessage: (msg) => {
    if (msg.role === "agent") process.stdout.write(msg.content);
  },
});
```

##### Stream to stdout

- Useful for CLI tools and quick terminal feedback.
- Helpful when you only need incremental text output from the agent.

```ts
import { AgentClient } from "@haustle/notion-orm";

const thread = await notion.agents.yourAgentName.chatStream({
  message: "Generate a prep list for that plan.",
  onMessage: (msg) => {
    if (msg.role === "agent") process.stdout.write(msg.content);
  },
});

const finalResponse = AgentClient.getAgentResponse(thread);
console.log("\nFinal:", finalResponse);
```

##### Terminal chat app (`while` loop + thread continuation)

- Useful for local testing and prompt iteration during development.
- Helpful as a minimal chat REPL before building a UI.

```ts
import { createInterface } from "node:readline/promises";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

let threadId: string | undefined;

while (true) {
  const input = (await rl.question("You: ")).trim();
  if (!input || input === "/exit") break;

  process.stdout.write("Agent: ");
  const thread = await notion.agents.yourAgentName.chatStream({
    message: input,
    threadId,
    onMessage: (msg) => {
      if (msg.role === "agent") process.stdout.write(msg.content);
    },
  });
  process.stdout.write("\n");

  threadId = thread.thread_id;
}

rl.close();
```

##### SSE endpoint (stream to browser/client)

- Useful when streaming agent responses into a web app in real time.
- Helpful for server-to-client incremental updates without WebSockets.

```ts
app.post("/api/agent/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { message, threadId } = req.body;

  const thread = await notion.agents.yourAgentName.chatStream({
    message,
    threadId,
    onMessage: (msg) => {
      if (msg.role !== "agent") return;
      res.write(`data: ${JSON.stringify({ event: "delta", text: msg.content })}\n\n`);
    },
  });

  res.write(`data: ${JSON.stringify({ event: "done", threadId: thread.thread_id })}\n\n`);
  res.end();
});
```

#### Agent method reference


| method                                           | returns                                                | what it is for                                                  |
| ------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------- |
| `listThreads()`                                  | `Array<{ id: string; title: string; status: string }>` | Show recent conversations to users before they select one       |
| `getThreadInfo(threadId)`                        | `ThreadListItem`                                       | Fetch full metadata for one thread                              |
| `getThreadTitle(threadId)`                       | `string`                                               | Resolve a thread name for UI labels                             |
| `chat({ message, threadId? })`                   | `{ status, threadId, isNewChat }`                      | Non-streaming send/continue call, then poll or fetch messages   |
| `chatStream({ message, threadId?, onMessage? })` | `ThreadInfo`                                           | Streaming UX path with optional callback for each message chunk |
| `getMessages(threadId, { role? })`               | `Array<{ role: "user" | "agent"; content: string }>`   | Read thread history, optionally filtered to one role            |
| `pollThread(threadId, options?)`                 | `{ status, threadId, title? }`                         | Wait until Notion finishes processing a thread                  |
| `AgentClient.getAgentResponse(threadInfo)`       | `string`                                               | Extract combined plain-text agent output from a streamed thread |


`chatStream(...)` returns `ThreadInfo` with the following properties:


| ThreadInfo property | type                                                 | description                                              | example                                                                                            |
| ------------------- | ---------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `thread_id`         | `string`                                             | Stable thread identifier used to continue a conversation | `"1f4e6f4a-5b58-4d91-a7fc-2f5f2a0f6bb1"`                                                           |
| `agent_id`          | `string`                                             | Agent identifier that produced the response              | `"2c3c495da03c8078b95500927f02d213"`                                                               |
| `messages`          | `Array<{ role: "user" | "agent"; content: string }>` | Full message history currently available in the thread   | `[{ role: "user", content: "Plan meals" }, { role: "agent", content: "Here is a 3-day plan..." }]` |


`messages` item shape:


| message property | type               | description                |
| ---------------- | ------------------ | -------------------------- |
| `role`           | `user` | `agent` (`string`) | Message author             |
| `content`        | `string`           | Plain text message content |


## Supported database properties


| property_type      | expected returned shape                                              | example value                                 |
| ------------------ | -------------------------------------------------------------------- | --------------------------------------------- |
| `title`            | `string`                                                             | `"How to Change Your Mind"`                   |
| `rich_text`        | `string`                                                      | `"Long-form notes from the page"`             |
| `number`           | `number`                                                      | `460`                                         |
| `date`             | `{ start: string; end: string }`                             | `{ start: "2026-03-01", end: "2026-03-02" }`  |
| `status`           | `string`                                                      | `"In progress"`                               |
| `select`           | `string`                                                      | `"Non-fiction"`                               |
| `multi_select`     | `string[]`                                                    | `["Sci-Fi", "Biography"]`                     |
| `checkbox`         | `boolean`                                                            | `true`                                        |
| `email`            | `string`                                                      | `"tyrus@haustle.studio"`                      |
| `phone_number`     | `string`                                                      | `"0000000000"`                                |
| `url`              | `string`                                                      | `"https://developers.notion.com/"`            |
| `formula`          | `string | number | boolean | { start: string; end?: string }` | `42`                                          |
| `files`            | `Array<{ name: string; url: string }>`                               | `[{ name: "brief.pdf", url: "https://..." }]` |
| `people`           | `string[]`                                                           | `["Ada Lovelace", "user_123"]`                |
| `relation`         | `string[]`                                                           | `["6f7f9cbf8d4548f8a194661e73f7f5d9"]`        |
| `created_by`       | `string`                                                      | `"Ada Lovelace"`                              |
| `last_edited_by`   | `string`                                                      | `"user_123"`                                  |
| `created_time`     | `string`                                                      | `"2026-03-01T10:30:00.000Z"`                  |
| `last_edited_time` | `string`                                                      | `"2026-03-01T13:15:00.000Z"`                  |
| `unique_id`        | `string`                                                      | `"TASK-42"`                                   |


`rollup` is not supported yet.

Filterable properties are a subset (for example, `formula`, `files`, and `relation` are currently non-filterable).

## Project Structure

```txt
.
├── src
│   ├── cli              # notion init / add / sync
│   ├── config           # config discovery, loading, and validation
│   ├── client           # runtime DatabaseClient + AgentClient
│   │   └── query        # typed filters + response simplification
│   ├── ast              # code generation internals
│   │   ├── database
│   │   ├── agents
│   │   └── shared
│   └── types            # local type bridges
├── plugins              # lint/tooling helpers
└── build                # generated output (after build/sync)
    ├── src
    ├── db
    └── agents
```

