import { Button } from "@/components/ui/button";
import { useThreads, type ThreadsStatus } from "@/providers/Thread";
import type { Thread } from "@/lib/agent-types";
import { useEffect, useRef } from "react";

import { useQueryState, parseAsBoolean } from "nuqs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

function ThreadList({
  threads,
  onThreadClick,
}: {
  threads: Thread[];
  onThreadClick?: (threadId: string) => void;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");

  return (
    <div className="[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 flex min-h-0 w-full flex-1 flex-col items-start justify-start gap-2 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
      {threads.map((t) => {
        const title = t.metadata?.title?.trim();
        const itemText = title && title.length > 0 ? title : "New conversation";
        return (
          <div
            key={t.thread_id}
            className="w-full px-1"
          >
            <Button
              variant="ghost"
              className="w-[280px] items-start justify-start text-left font-normal"
              onClick={(e) => {
                e.preventDefault();
                onThreadClick?.(t.thread_id);
                if (t.thread_id === threadId) return;
                setThreadId(t.thread_id);
              }}
            >
              <p className="truncate text-ellipsis">{itemText}</p>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function ThreadHistoryLoading() {
  return (
    <div className="[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 flex min-h-0 w-full flex-1 flex-col items-start justify-start gap-2 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
      {Array.from({ length: 30 }).map((_, i) => (
        <Skeleton
          key={`skeleton-${i}`}
          className="h-10 w-[280px]"
        />
      ))}
    </div>
  );
}

function ThreadHistoryEmpty() {
  return (
    <div className="text-muted-foreground flex min-h-0 w-full flex-1 items-center justify-center px-6 text-center text-sm">
      No conversations yet
    </div>
  );
}

function ThreadHistoryError({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="space-y-1">
        <p className="text-sm font-medium">Could not load history</p>
        {error && <p className="text-muted-foreground text-xs">{error}</p>}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

function ThreadHistoryRefreshError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border-destructive/30 bg-destructive/5 mx-2 flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <p className="text-destructive truncate text-sm">
        Could not refresh history
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

function ThreadHistoryContent({
  threads,
  threadsStatus,
  threadsError,
  onRetry,
  onThreadClick,
}: {
  threads: Thread[];
  threadsStatus: ThreadsStatus;
  threadsError: string | null;
  onRetry: () => void;
  onThreadClick?: (threadId: string) => void;
}) {
  const hasThreads = threads.length > 0;

  if (
    !hasThreads &&
    (threadsStatus === "idle" || threadsStatus === "loading")
  ) {
    return <ThreadHistoryLoading />;
  }

  if (!hasThreads && threadsStatus === "error") {
    return (
      <ThreadHistoryError
        error={threadsError}
        onRetry={onRetry}
      />
    );
  }

  if (!hasThreads) {
    return <ThreadHistoryEmpty />;
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2">
      {threadsStatus === "error" && (
        <ThreadHistoryRefreshError onRetry={onRetry} />
      )}
      <ThreadList
        threads={threads}
        onThreadClick={onThreadClick}
      />
    </div>
  );
}

export default function ThreadHistory() {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );

  const { threads, threadsStatus, threadsError, refreshThreads } = useThreads();
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const isOpen = !!chatHistoryOpen;
    const opened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!opened) return;
    refreshThreads({
      force: true,
      silent: threads.length > 0 || threadsStatus === "success",
    }).catch(console.error);
  }, [chatHistoryOpen, refreshThreads, threads.length, threadsStatus]);

  const retryThreads = () => {
    refreshThreads({ force: true }).catch(console.error);
  };

  return (
    <>
      <div className="shadow-inner-right border-border hidden h-screen w-[300px] shrink-0 flex-col items-start justify-start gap-6 border-r-[1px] lg:flex">
        <div className="flex w-full items-center justify-between px-4 pt-1.5">
          <Button
            className="hover:bg-accent"
            variant="ghost"
            onClick={() => setChatHistoryOpen((p) => !p)}
          >
            {chatHistoryOpen ? (
              <PanelRightOpen className="size-5" />
            ) : (
              <PanelRightClose className="size-5" />
            )}
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">History</h1>
        </div>
        <ThreadHistoryContent
          threads={threads}
          threadsStatus={threadsStatus}
          threadsError={threadsError}
          onRetry={retryThreads}
        />
      </div>
      <div className="lg:hidden">
        <Sheet
          open={!!chatHistoryOpen && !isLargeScreen}
          onOpenChange={(open) => {
            if (isLargeScreen) return;
            setChatHistoryOpen(open);
          }}
        >
          <SheetContent
            side="left"
            className="flex min-h-0 lg:hidden"
          >
            <SheetHeader>
              <SheetTitle>History</SheetTitle>
            </SheetHeader>
            <ThreadHistoryContent
              threads={threads}
              threadsStatus={threadsStatus}
              threadsError={threadsError}
              onRetry={retryThreads}
              onThreadClick={() => setChatHistoryOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
