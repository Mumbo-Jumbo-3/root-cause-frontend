"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { useThreads } from "./Thread";
import type { Message } from "@/lib/agent-types";
import {
  useStageTimeline,
  type PhaseEvent,
  type StageTimelineState,
} from "@/hooks/use-stage-timeline";

const STREAM_DEBUG = process.env.NEXT_PUBLIC_STREAM_DEBUG === "true";
const streamLog = (...args: unknown[]) => {
  if (STREAM_DEBUG) console.debug("[stream]", ...args);
};

export type StateType = { messages: Message[]; ui?: never[] };

type SubmitInput = {
  messages?: Message[] | Message;
  context?: Record<string, unknown>;
};

type SubmitOptions = {
  optimisticValues?: (prev: StateType) => StateType;
};

type ActiveRun = {
  runId: string;
  threadId: string | null;
};

interface AgentStream {
  messages: Message[];
  values: StateType;
  isLoading: boolean;
  error: Error | undefined;
  interrupt: undefined;
  submit: (input: SubmitInput, options?: SubmitOptions) => void;
  stop: () => void;
  getMessagesMetadata: (msg: Message) => undefined;
  setBranch: (branch: string) => void;
  stageTimeline: StageTimelineState;
}

const StreamContext = createContext<AgentStream | undefined>(undefined);

async function checkGraphStatus(apiUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/info`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function normalizeInput(input: SubmitInput): {
  messages: Message[];
  context?: Record<string, unknown>;
} {
  let msgs: Message[] = [];
  if (Array.isArray(input.messages)) {
    msgs = input.messages;
  } else if (input.messages) {
    msgs = [input.messages];
  }
  return { messages: msgs, context: input.context };
}

async function createThread(apiUrl: string): Promise<string> {
  const res = await fetch(`${apiUrl}/threads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Failed to create thread: ${res.status}`);
  const data = (await res.json()) as { thread_id: string };
  return data.thread_id;
}

interface SSEEvent {
  event: string;
  data: string;
}

function parseSSEBuffer(buffer: string): {
  events: SSEEvent[];
  remainder: string;
} {
  const events: SSEEvent[] = [];
  let remainder = buffer.replace(/\r\n/g, "\n");
  let idx: number;
  while ((idx = remainder.indexOf("\n\n")) !== -1) {
    const block = remainder.slice(0, idx);
    remainder = remainder.slice(idx + 2);
    let eventName = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    events.push({ event: eventName, data: dataLines.join("\n") });
  }
  return { events, remainder };
}

function messageContentToText(content: Message["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (c): c is { type: "text"; text: string } =>
        typeof c === "object" &&
        c !== null &&
        (c as { type?: string }).type === "text",
    )
    .map((c) => c.text)
    .join("");
}

function useAgentStream(config: {
  apiUrl: string;
  threadId: string | null;
  onThreadId: (id: string) => void;
}): AgentStream {
  const { apiUrl, threadId, onThreadId } = config;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const activeRunRef = useRef<ActiveRun | null>(null);
  const currentThreadIdRef = useRef<string | null>(threadId);
  const hydrationRequestIdRef = useRef(0);
  const stageTimeline = useStageTimeline();

  const isActiveRunId = useCallback((runId: string) => {
    return activeRunRef.current?.runId === runId;
  }, []);

  const isCurrentRun = useCallback((runId: string, runThreadId: string) => {
    const activeRun = activeRunRef.current;
    return (
      activeRun?.runId === runId &&
      activeRun.threadId === runThreadId &&
      currentThreadIdRef.current === runThreadId
    );
  }, []);

  useEffect(() => {
    currentThreadIdRef.current = threadId;
    const activeRun = activeRunRef.current;
    if (activeRun?.threadId && threadId !== activeRun.threadId) {
      activeRunRef.current = null;
      abortRef.current?.abort();
      abortRef.current = null;
      setIsLoading(false);
    }
  }, [threadId]);

  // Load message history when thread id changes
  useEffect(() => {
    const requestId = hydrationRequestIdRef.current + 1;
    hydrationRequestIdRef.current = requestId;

    if (!threadId) {
      setMessages([]);
      return;
    }

    if (activeRunRef.current?.threadId === threadId) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/threads/${threadId}/state`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          values?: { messages?: Message[] };
        };
        if (
          !cancelled &&
          hydrationRequestIdRef.current === requestId &&
          activeRunRef.current?.threadId !== threadId &&
          currentThreadIdRef.current === threadId
        ) {
          setMessages(data.values?.messages ?? []);
        }
      } catch {
        // leave messages as-is
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, threadId]);

  const submit = useCallback(
    (input: SubmitInput, options?: SubmitOptions) => {
      const runId = uuidv4();

      setError(undefined);
      setIsLoading(true);
      stageTimeline.reset();
      hydrationRequestIdRef.current += 1;

      activeRunRef.current = { runId, threadId };

      // Optimistic update (e.g., show user's message immediately)
      if (options?.optimisticValues) {
        setMessages((prev) => {
          const next = options.optimisticValues!({ messages: prev });
          return next.messages;
        });
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const assistantId = uuidv4();
      let seenToken = false;

      (async () => {
        try {
          let id = threadId;
          if (!id) {
            id = await createThread(apiUrl);
            if (!isActiveRunId(runId)) return;
            activeRunRef.current = { runId, threadId: id };
            currentThreadIdRef.current = id;
            onThreadId(id);
          } else {
            activeRunRef.current = { runId, threadId: id };
            currentThreadIdRef.current = id;
          }

          const normalized = normalizeInput(input);

          const res = await fetch(`${apiUrl}/runs/stream`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ thread_id: id, input: normalized }),
            signal: controller.signal,
          });
          if (!res.ok || !res.body) {
            throw new Error(`stream error: ${res.status}`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parsed = parseSSEBuffer(buffer);
            buffer = parsed.remainder;

            for (const evt of parsed.events) {
              if (!isCurrentRun(runId, id)) return;

              if (evt.event === "token") {
                const payload = JSON.parse(evt.data || "{}") as {
                  content?: string;
                  node?: string;
                };
                if (payload.node !== "claude_synthesize") continue;
                const chunk = payload.content ?? "";
                if (!chunk) continue;
                setMessages((prev) => {
                  if (!isCurrentRun(runId, id)) return prev;
                  if (!seenToken) {
                    seenToken = true;
                    streamLog("first token", {
                      assistantId,
                      chars: chunk.length,
                    });
                    return [
                      ...prev,
                      { id: assistantId, type: "ai", content: chunk },
                    ];
                  }
                  const last = prev[prev.length - 1];
                  if (last?.type === "ai" && last.id === assistantId) {
                    const prevText = messageContentToText(last.content);
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: prevText + chunk },
                    ];
                  }
                  return [
                    ...prev,
                    { id: assistantId, type: "ai", content: chunk },
                  ];
                });
              } else if (evt.event === "phase") {
                try {
                  const payload = JSON.parse(evt.data || "{}") as PhaseEvent;
                  streamLog("phase", payload);
                  if (payload.phase && payload.status) {
                    stageTimeline.applyPhase(payload);
                  }
                } catch (err) {
                  streamLog("phase parse error", err);
                }
              } else if (evt.event === "values") {
                const payload = JSON.parse(evt.data || "{}") as {
                  messages?: Message[];
                };
                streamLog("values", { messages: payload.messages?.length });
                if (payload.messages && isCurrentRun(runId, id)) {
                  setMessages(payload.messages);
                }
              } else if (evt.event === "error") {
                const payload = JSON.parse(evt.data || "{}") as {
                  error?: string;
                };
                streamLog("error", payload);
                throw new Error(payload.error || "stream error");
              }
            }
          }
        } catch (err) {
          if (isActiveRunId(runId) && (err as Error).name !== "AbortError") {
            setError(err as Error);
          }
        } finally {
          if (isActiveRunId(runId)) {
            activeRunRef.current = null;
            if (abortRef.current === controller) abortRef.current = null;
            setIsLoading(false);
          }
        }
      })();
    },
    [apiUrl, threadId, onThreadId, stageTimeline, isActiveRunId, isCurrentRun],
  );

  const stop = useCallback(() => {
    activeRunRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  return {
    messages,
    values: { messages },
    isLoading,
    error,
    interrupt: undefined,
    submit,
    stop,
    getMessagesMetadata: () => undefined,
    setBranch: () => {},
    stageTimeline: stageTimeline.state,
  };
}

function StreamSession({
  children,
  apiUrl,
}: {
  children: ReactNode;
  apiUrl: string;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const { refreshThreads } = useThreads();

  const onThreadId = useCallback(
    (id: string) => {
      setThreadId(id);
      // small delay so backend's create has committed before listing
      setTimeout(() => {
        refreshThreads({ force: true, silent: true }).catch(console.error);
      }, 500);
    },
    [refreshThreads, setThreadId],
  );

  const stream = useAgentStream({ apiUrl, threadId, onThreadId });

  useEffect(() => {
    checkGraphStatus(apiUrl).then((ok) => {
      if (!ok) {
        toast.error("Failed to connect to the agent server", {
          description: () => (
            <p>
              Please ensure the backend is running at <code>{apiUrl}</code>.
            </p>
          ),
          duration: 10000,
          richColors: true,
          closeButton: true,
        });
      }
    });
  }, [apiUrl]);

  return (
    <StreamContext.Provider value={stream}>{children}</StreamContext.Provider>
  );
}

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4">
        <div className="bg-background text-muted-foreground max-w-md rounded-lg border p-6 text-sm">
          <p className="text-foreground font-semibold">Configuration missing</p>
          <p className="mt-2">
            Set <code>NEXT_PUBLIC_API_URL</code> in the deployment environment.
          </p>
        </div>
      </div>
    );
  }

  return <StreamSession apiUrl={apiUrl}>{children}</StreamSession>;
};

export const useStreamContext = (): AgentStream => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};

export default StreamContext;
