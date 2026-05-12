import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, CopyCheck } from "lucide-react";

import type { AIMessage, Message, MessageContentBlock } from "@/lib/agent-types";
import { cn } from "@/lib/utils";
import { getContentString } from "../utils";
import { MarkdownText } from "../markdown-text";
import { TooltipIconButton } from "../tooltip-icon-button";
import { ToolCalls, ToolResult } from "./tool-calls";
import { useLoadingStage } from "./loading-stages";

function parseAnthropicStreamedToolCalls(
  content: MessageContentBlock[],
): AIMessage["tool_calls"] {
  const toolCallContents = content.filter(
    (c): c is MessageContentBlock & { type: "tool_use" } =>
      c.type === "tool_use" && !!(c as { id?: string }).id,
  );

  return toolCallContents.map((tc) => {
    const toolCall = tc as Record<string, unknown>;
    const input = toolCall.input;
    let args: Record<string, unknown> = {};
    if (input && typeof input === "object") {
      args = input as Record<string, unknown>;
    }
    return {
      name: (toolCall.name as string | undefined) ?? "",
      id: (toolCall.id as string | undefined) ?? "",
      args,
      type: "tool_call" as const,
    };
  });
}

function CopyButton({ content, disabled }: { content: string; disabled: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipIconButton
      onClick={handleCopy}
      variant="ghost"
      tooltip="Copy"
      disabled={disabled}
    >
      <AnimatePresence
        mode="wait"
        initial={false}
      >
        {copied ? (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <CopyCheck className="text-green-500" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <Copy />
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipIconButton>
  );
}

export function AssistantMessage({
  message,
  isLoading,
}: {
  message: Message | undefined;
  isLoading: boolean;
}) {
  const content = message?.content ?? [];
  const contentString = getContentString(content);

  const anthropicStreamedToolCalls = Array.isArray(content)
    ? parseAnthropicStreamedToolCalls(content as MessageContentBlock[])
    : undefined;

  const hasToolCalls =
    message &&
    message.type === "ai" &&
    "tool_calls" in message &&
    message.tool_calls &&
    message.tool_calls.length > 0;
  const toolCallsHaveContents =
    hasToolCalls &&
    (message as AIMessage).tool_calls?.some(
      (tc) => tc.args && Object.keys(tc.args).length > 0,
    );
  const hasAnthropicToolCalls = !!anthropicStreamedToolCalls?.length;
  const isToolResult = message?.type === "tool";

  return (
    <div className="group mr-auto flex w-full items-start gap-2">
      <div className="flex w-full flex-col gap-2">
        {isToolResult ? (
          <ToolResult message={message} />
        ) : (
          <>
            {contentString.length > 0 && (
              <div className="py-1">
                <MarkdownText>{contentString}</MarkdownText>
              </div>
            )}

            {(hasToolCalls && toolCallsHaveContents && (
              <ToolCalls toolCalls={(message as AIMessage).tool_calls} />
            )) ||
              (hasAnthropicToolCalls && (
                <ToolCalls toolCalls={anthropicStreamedToolCalls} />
              )) ||
              (hasToolCalls && (
                <ToolCalls toolCalls={(message as AIMessage).tool_calls} />
              ))}

            <div
              className={cn(
                "mr-auto flex items-center gap-2 transition-opacity",
                "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
              )}
            >
              <CopyButton
                content={contentString}
                disabled={isLoading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AssistantMessageLoading() {
  const { currentMessage, progress } = useLoadingStage();

  return (
    <div className="mr-auto flex items-start gap-2">
      <div className="bg-muted flex max-w-xs flex-col gap-2 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full" />
          <AnimatePresence
            mode="wait"
            initial={false}
          >
            <motion.span
              key={currentMessage}
              className="text-muted-foreground text-sm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {currentMessage}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="bg-muted-foreground/20 h-1 w-full overflow-hidden rounded-full">
          <motion.div
            className="bg-primary relative h-full rounded-full"
            initial={{ width: "5%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="absolute inset-0 animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
