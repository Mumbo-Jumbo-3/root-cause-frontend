export type MessageContentText = { type: "text"; text: string };
export type MessageContentImage = {
  type: "image_url";
  image_url: { url: string };
};
export type MessageContentToolUse = {
  type: "tool_use";
  id?: string;
  name?: string;
  input?: unknown;
};
export type MessageContentBlock =
  | MessageContentText
  | MessageContentImage
  | MessageContentToolUse
  | { type: string; [key: string]: unknown };

export type MessageContent = string | MessageContentBlock[];

export interface ToolCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
  type?: "tool_call";
}

export interface BaseMessageLike {
  id?: string;
  content: MessageContent;
}

export interface HumanMessage extends BaseMessageLike {
  type: "human";
}

/** Where a cited passage ends in the answer text, and what it cites. */
export interface CitationRef {
  offset: number;
  /** Resolved by the backend on saved messages. */
  evidence_id?: string;
  /** Live stream only: index into the synthesize step's evidence list. */
  document_index?: number;
  quote?: string;
}

/** Phase events that produced an answer, saved alongside it. */
export interface ResearchTrace {
  version: number;
  elapsed_ms: number;
  events: {
    phase: string;
    status: "started" | "completed";
    meta?: Record<string, string | number | boolean>;
    detail?: Record<string, unknown>;
  }[];
}

export interface AIMessage extends BaseMessageLike {
  type: "ai";
  tool_calls?: ToolCall[];
  citations?: CitationRef[];
  research_trace?: ResearchTrace;
}

export interface ToolMessage extends BaseMessageLike {
  type: "tool";
  tool_call_id?: string;
  name?: string;
}

export interface SystemMessage extends BaseMessageLike {
  type: "system";
}

export type Message = HumanMessage | AIMessage | ToolMessage | SystemMessage;

export interface Thread {
  thread_id: string;
  metadata?: { user_id?: string; title?: string };
  created_at?: string;
  updated_at?: string;
  values?: { messages?: Message[] };
}

export interface Checkpoint {
  thread_id: string;
  checkpoint_id?: string;
}

export interface MultimodalDataBlock {
  type: "image" | "file";
  mimeType: string;
  data: string;
  metadata?: { name?: string; filename?: string };
}
