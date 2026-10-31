"use client";

import type { Message } from "@/lib/agent-types";
import { DO_NOT_RENDER_ID_PREFIX } from "@/lib/ensure-tool-responses";
import {
  cachedTimelineFromTrace,
  type StageTimelineState,
} from "@/hooks/use-stage-timeline";
import { MarkdownText } from "../markdown-text";
import { getContentString } from "../utils";
import {
  ResearchFocusProvider,
  TurnResearchContext,
} from "../research-context";
import { useCitedAnswer } from "./ai";
import { SourcesList } from "./citations";
import { StageTimeline } from "./stage-timeline";

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

function ReadOnlyAIMessage({
  message,
  turn,
  timeline,
}: {
  message: Message;
  turn: number;
  timeline: StageTimelineState | null;
}) {
  const { markdown, research } = useCitedAnswer(message, turn, timeline);
  if (!getContentString(message.content)) return null;
  return (
    <TurnResearchContext.Provider value={research}>
      <div className="mr-auto w-full">
        <MarkdownText>{markdown}</MarkdownText>
        <SourcesList />
      </div>
    </TurnResearchContext.Provider>
  );
}

export function ReadOnlyMessages({ messages }: { messages: Message[] }) {
  const visible = messages.filter(
    (m) =>
      !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX) &&
      (m.type === "human" || m.type === "ai"),
  );

  // turns[i] is the question/answer round message i belongs to.
  const turns: number[] = [];
  const timelines = new Map<number, StageTimelineState>();
  let turn = -1;
  for (const message of visible) {
    if (message.type === "human") turn += 1;
    else if (
      message.type === "ai" &&
      message.research_trace &&
      !timelines.has(turn)
    ) {
      timelines.set(turn, cachedTimelineFromTrace(message.research_trace));
    }
    turns.push(turn);
  }

  return (
    <ResearchFocusProvider>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-14 pb-8 sm:pt-8">
        {visible.map((message, idx) => {
          const turn = turns[idx];
          const timeline = timelines.get(turn) ?? null;
          return message.type === "human" ? (
            <div
              key={message.id ?? `human-${idx}`}
              className="flex flex-col gap-4"
            >
              <ReadOnlyHumanMessage message={message} />
              {timeline && (
                <StageTimeline
                  state={timeline}
                  turn={turn}
                  defaultCollapsed
                />
              )}
            </div>
          ) : (
            <ReadOnlyAIMessage
              key={message.id ?? `ai-${idx}`}
              message={message}
              turn={turn}
              timeline={timeline}
            />
          );
        })}
      </div>
    </ResearchFocusProvider>
  );
}
