# Root Cause — frontend

The chat UI for Root Cause, an AI health agent. It streams the agent's answer along with its progress (classifying, searching, retrieving, judging, writing), and supports sign-in, saved threads, shareable conversations, and the featured and nutrient pages.

The agent and its design are documented in **[root-cause-backend](https://github.com/Mumbo-Jumbo-3/root-cause-backend)**.

Built with Next.js, React, TypeScript, Tailwind and Clerk. The browser only talks to this app's `/api` routes, which forward requests to the backend (`LANGGRAPH_API_URL`).

## Running locally

Start the backend on port 2024 first (see its README), then:

```bash
bun install
cp .env.example .env   # add your Clerk keys
bun run dev
```

Open http://localhost:3000.

## Credits

Forked from [langchain-ai/agent-chat-ui](https://github.com/langchain-ai/agent-chat-ui) (MIT; see [LICENSE](LICENSE)).
