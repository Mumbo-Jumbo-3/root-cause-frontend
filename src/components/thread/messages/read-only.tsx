import type { Message } from "@/lib/agent-types";
import { DO_NOT_RENDER_ID_PREFIX } from "@/lib/ensure-tool-responses";
import { MarkdownText } from "../markdown-text";
import { getContentString } from "../utils";

function ReadOnlyHumanMessage({ message }: { message: Message }) {
  const content = getContentString(message.content);
  if (!content) return null;
  return (
    <div className="ml-auto flex max-w-[85%] items-center gap-2">
      <p className="bg-muted ml-auto w-fit rounded-3xl px-4 py-2 break-words whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}

function ReadOnlyAIMessage({ message }: { message: Message }) {
  const content = getContentString(message.content);
  if (!content) return null;
  return (
    <div className="mr-auto w-full">
      <MarkdownText>{content}</MarkdownText>
    </div>
  );
}

export function ReadOnlyMessages({ messages }: { messages: Message[] }) {
  const visible = messages.filter(
    (m) =>
      !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX) &&
      (m.type === "human" || m.type === "ai"),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-14 pb-8 sm:pt-8">
      {visible.map((message, idx) =>
        message.type === "human" ? (
          <ReadOnlyHumanMessage
            key={message.id ?? `human-${idx}`}
            message={message}
          />
        ) : (
          <ReadOnlyAIMessage
            key={message.id ?? `ai-${idx}`}
            message={message}
          />
        ),
      )}
    </div>
  );
}
