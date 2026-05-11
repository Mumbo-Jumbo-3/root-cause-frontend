"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { ThreadProvider, useThreads } from "@/providers/Thread";
import { ThreadHistoryContent } from "@/components/history/thread-list";
import { Toaster } from "@/components/ui/sonner";

function HistoryContent() {
  const { threads, threadsStatus, threadsError, refreshThreads } = useThreads();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    refreshThreads({ force: true, silent: false }).catch(console.error);
  }, [refreshThreads]);

  const retryThreads = () => {
    refreshThreads({ force: true }).catch(console.error);
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">History</h1>
        <p className="text-muted-foreground text-base">
          Search your past conversations.
        </p>
        <Input
          type="search"
          placeholder="Search conversations…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-md"
        />
      </section>

      <ThreadHistoryContent
        threads={threads}
        threadsStatus={threadsStatus}
        threadsError={threadsError}
        filter={filter}
        onRetry={retryThreads}
      />
    </main>
  );
}

export default function HistoryPage(): React.ReactNode {
  return (
    <React.Suspense fallback={<div>Loading…</div>}>
      <Toaster />
      <ThreadProvider>
        <div className="min-h-screen">
          <SiteHeader />
          <HistoryContent />
        </div>
      </ThreadProvider>
    </React.Suspense>
  );
}
