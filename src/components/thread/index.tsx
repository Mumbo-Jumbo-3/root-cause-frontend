import { v4 as uuidv4 } from "uuid";
import { ReactNode, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { useState, FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { StageTimeline } from "./messages/stage-timeline";
import { HumanMessage } from "./messages/human";
import { DO_NOT_RENDER_ID_PREFIX } from "@/lib/ensure-tool-responses";
import type { Message } from "@/lib/agent-types";
import { RootCauseLogo } from "../icons/root-cause";
import { TooltipIconButton } from "./tooltip-icon-button";
import {
  ArrowDown,
  Copy,
  LoaderCircle,
  Share2,
} from "lucide-react";
import { getContentString } from "./utils";
import { useQueryState } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { AppShell } from "@/components/app-shell";
import { FeaturedShowcase } from "../featured/showcase";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      // eslint-disable-next-line react-hooks/refs -- passing ref object to ref prop, not reading .current
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={props.className}
    >
      <div
        // eslint-disable-next-line react-hooks/refs -- passing ref object to ref prop, not reading .current
        ref={context.contentRef}
        className={props.contentClassName}
      >
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={props.className}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="h-4 w-4" />
      <span>Scroll to bottom</span>
    </Button>
  );
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through to the textarea strategy for stricter mobile browsers.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, value.length);

  try {
    const copied = document.execCommand("copy");
    if (!copied) throw new Error("Clipboard permission was denied");
  } finally {
    textarea.remove();
  }
}

function isShareCanceled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function Thread() {
  const [threadId] = useQueryState("threadId");
  const [input, setInput] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{
    threadId: string;
    url: string;
  } | null>(null);
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;
  const stageTimeline = stream.stageTimeline;
  const hasStageEvents = stageTimeline.hasAny;
  const currentShareUrl =
    shareTarget?.threadId === threadId ? shareTarget.url : null;

  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    setNativeShareAvailable(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as Error).message;
      if (!message || lastError.current === message) return;
      lastError.current = message;
      toast.error("An error occurred. Please try again.", {
        description: (
          <p>
            <strong>Error:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch {
      // no-op
    }
  }, [stream.error]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim().length === 0 || isLoading) return;

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: input,
    };

    stream.submit(
      { messages: [newHumanMessage] },
      {
        optimisticValues: (prev) => ({
          messages: [...(prev.messages ?? []), newHumanMessage],
        }),
      },
    );

    setInput("");
  };

  const handleShare = async () => {
    if (!threadId || sharing) return;
    if (currentShareUrl) {
      setShareSheetOpen(true);
      return;
    }

    const firstHuman = messages.find((m) => m.type === "human");
    const firstMessage = firstHuman ? getContentString(firstHuman.content) : "";
    const title = firstMessage.slice(0, 80) || "Health conversation";

    setSharing(true);
    try {
      const res = await fetch("/api/share-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          title,
          first_message: firstMessage,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const { share_id } = (await res.json()) as { share_id: string };
      const url = `${window.location.origin}/share/${share_id}`;
      setShareTarget({ threadId, url });
      setShareSheetOpen(true);
    } catch (err) {
      toast.error("Could not create share link", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSharing(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!currentShareUrl) return;

    try {
      await copyTextToClipboard(currentShareUrl);
      toast.success("Share link copied", { description: currentShareUrl });
    } catch (err) {
      toast.error("Link created, but copying failed", {
        description:
          err instanceof Error
            ? err.message
            : "Use the visible link to copy it manually.",
      });
    }
  };

  const handleNativeShare = async () => {
    if (!currentShareUrl || !nativeShareAvailable) return;

    try {
      await navigator.share({
        title: "Root Cause conversation",
        url: currentShareUrl,
      });
    } catch (err) {
      if (isShareCanceled(err)) return;
      toast.error("Link created, but sharing failed", {
        description:
          err instanceof Error ? err.message : "Try copying the link instead.",
      });
    }
  };

  const chatStarted = !!threadId || !!messages.length;

  return (
    <AppShell>
      {threadId && (
        <div className="absolute top-2 right-3 z-30">
          <TooltipIconButton
            tooltip="Share"
            tooltipClassName="text-base font-bold"
            variant="ghost"
            className="size-9 p-1.5"
            disabled={sharing}
            onClick={handleShare}
          >
            {sharing ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Share2 className="size-5" />
            )}
          </TooltipIconButton>
        </div>
      )}

      <StickToBottom className="relative min-h-0 flex-1 overflow-hidden">
        <StickyToBottomContent
          className={cn(
            "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 absolute inset-0 overflow-y-scroll px-4 [scrollbar-gutter:stable_both-edges] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent",
            !chatStarted && "flex flex-col items-stretch justify-center",
            chatStarted && "grid grid-cols-[minmax(0,1fr)] grid-rows-[1fr_auto]",
          )}
          contentClassName={cn(
            "max-w-3xl mx-auto flex flex-col gap-4 w-full",
            chatStarted && "pt-14 sm:pt-8 pb-16",
          )}
          content={
            <>
              {(() => {
                const visible = messages.filter(
                  (m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX),
                );
                const lastHumanIdx = (() => {
                  for (let i = visible.length - 1; i >= 0; i--) {
                    if (visible[i].type === "human") return i;
                  }
                  return -1;
                })();
                const assistantStartedAfterLastHuman =
                  lastHumanIdx >= 0 &&
                  visible
                    .slice(lastHumanIdx + 1)
                    .some((message) => message.type === "ai");
                const showTimeline = hasStageEvents;
                const showFallbackLoader =
                  isLoading &&
                  !assistantStartedAfterLastHuman &&
                  !hasStageEvents;
                const timelineCollapsed =
                  assistantStartedAfterLastHuman || !isLoading;

                const rendered: ReactNode[] = [];
                visible.forEach((message, index) => {
                  rendered.push(
                    message.type === "human" ? (
                      <HumanMessage
                        key={message.id || `${message.type}-${index}`}
                        message={message}
                        isLoading={isLoading}
                        isFollowUp={index > 0}
                      />
                    ) : (
                      <AssistantMessage
                        key={message.id || `${message.type}-${index}`}
                        message={message}
                        isLoading={isLoading}
                      />
                    ),
                  );
                  if (index === lastHumanIdx && showTimeline) {
                    rendered.push(
                      <StageTimeline
                        key="stage-timeline"
                        state={stageTimeline}
                        defaultCollapsed={timelineCollapsed}
                      />,
                    );
                  }
                });
                return (
                  <>
                    {rendered}
                    <AnimatePresence>
                      {showFallbackLoader && (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        >
                          <AssistantMessageLoading />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                );
              })()}
            </>
          }
          footer={
            <div
              className={cn(
                "bg-background flex flex-col items-center",
                chatStarted ? "gap-8 sticky bottom-0" : "gap-3 sm:gap-8",
              )}
            >
              {!chatStarted && (
                <div className="flex w-full max-w-3xl min-w-0 flex-col items-center gap-3 sm:gap-6">
                  <div className="flex w-full min-w-0 flex-col items-center gap-2 sm:gap-3">
                    <RootCauseLogo
                      className="size-12 sm:size-16"
                      width={64}
                      height={64}
                    />
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                      Root Cause
                    </h1>
                    <p className="text-muted-foreground -mt-1 text-center text-base sm:-mt-2 sm:text-lg">
                      Get health knowledge from trusted sources
                    </p>
                  </div>

                  <FeaturedShowcase />
                </div>
              )}

              {chatStarted && (
                <ScrollToBottom className="animate-in fade-in-0 zoom-in-95 absolute bottom-full left-1/2 mb-4 -translate-x-1/2" />
              )}

              <div
                className={cn(
                  "bg-muted relative z-10 mx-auto w-full max-w-3xl rounded-2xl border-2 border-primary border-solid shadow-xs transition-all",
                  chatStarted && "mb-8",
                )}
              >
                <form
                  onSubmit={handleSubmit}
                  className="mx-auto flex max-w-3xl flex-col"
                >
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.metaKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        const el = e.target as HTMLElement | undefined;
                        const form = el?.closest("form");
                        form?.requestSubmit();
                      }
                    }}
                    placeholder="Type your message..."
                    className="field-sizing-content max-h-36 min-h-10 resize-none border-none bg-transparent px-3.5 pt-3.5 pb-1 leading-6 shadow-none ring-0 outline-none focus:ring-0 focus:outline-none"
                  />

                  <div className="flex items-center gap-6 p-2 pt-1">
                    {stream.isLoading ? (
                      <Button
                        key="stop"
                        onClick={() => stream.stop()}
                        className="ml-auto"
                      >
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="ml-auto bg-primary shadow-md transition-all"
                        disabled={isLoading || !input.trim()}
                      >
                        Send
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          }
        />
      </StickToBottom>

      <Sheet
        open={shareSheetOpen && !!currentShareUrl}
        onOpenChange={setShareSheetOpen}
      >
        <SheetContent
          side="top"
          className="mx-auto w-full max-w-lg gap-5 rounded-b-xl border-x"
        >
          <SheetHeader className="pr-12">
            <SheetTitle className="text-2xl font-bold">Share</SheetTitle>
            <SheetDescription>
              Anyone with this link can view this conversation.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4">
            <Input
              value={currentShareUrl ?? ""}
              readOnly
              className="font-mono text-xs sm:text-sm"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>

          <SheetFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={handleCopyShareUrl}
              className="w-full"
            >
              <Copy className="size-4" />
              Copy link
            </Button>
            {nativeShareAvailable && (
              <Button
                type="button"
                variant="outline"
                onClick={handleNativeShare}
                className="w-full"
              >
                <Share2 className="size-4" />
                Share
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
