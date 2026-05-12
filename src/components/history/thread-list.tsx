"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Thread } from "@/lib/agent-types";
import type { ThreadsStatus } from "@/providers/Thread";

export function ThreadList({
  threads,
  filter = "",
}: {
  threads: Thread[];
  filter?: string;
}) {
  const normalized = filter.trim().toLowerCase();
  const visible = normalized
    ? threads.filter((t) =>
        (t.metadata?.title ?? "").toLowerCase().includes(normalized),
      )
    : threads;

  if (normalized && visible.length === 0) {
    return (
      <div className="text-muted-foreground px-4 py-6 text-center text-sm">
        No conversations match &ldquo;{filter}&rdquo;
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-1">
      {visible.map((t) => {
        const title = t.metadata?.title?.trim();
        const itemText = title && title.length > 0 ? title : "New conversation";
        return (
          <Button
            key={t.thread_id}
            variant="ghost"
            className="h-auto w-full items-start justify-start py-2 text-left font-normal"
            asChild
          >
            <Link href={`/chat?threadId=${t.thread_id}`}>
              <p className="truncate text-ellipsis">{itemText}</p>
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

export function ThreadHistoryLoading() {
  return (
    <div className="flex w-full flex-col gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton
          key={`skeleton-${i}`}
          className="h-10 w-full"
        />
      ))}
    </div>
  );
}

export function ThreadHistoryEmpty() {
  return (
    <div className="text-muted-foreground py-10 text-center text-sm">
      No conversations yet
    </div>
  );
}

export function ThreadHistoryError({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
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

export function ThreadHistoryRefreshError({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="border-destructive/30 bg-destructive/5 flex items-center justify-between gap-2 rounded-md border px-3 py-2">
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

export function ThreadHistoryContent({
  threads,
  threadsStatus,
  threadsError,
  filter = "",
  onRetry,
}: {
  threads: Thread[];
  threadsStatus: ThreadsStatus;
  threadsError: string | null;
  filter?: string;
  onRetry: () => void;
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
    <div className="flex w-full flex-col gap-2">
      {threadsStatus === "error" && (
        <ThreadHistoryRefreshError onRetry={onRetry} />
      )}
      <ThreadList
        threads={threads}
        filter={filter}
      />
    </div>
  );
}
