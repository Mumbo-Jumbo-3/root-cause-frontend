"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/app-shell";
import { useThreads } from "@/providers/Thread";
import { ThreadHistoryContent } from "@/components/history/thread-list";
import { Toaster } from "@/components/ui/sonner";

function HistoryContent() {
  const { threads, threadsStatus, threadsError, refreshThreads } = useThreads();
  const [filter, setFilter] = useState("");
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/chat");
    }
  };

  useEffect(() => {
    refreshThreads({ force: true, silent: false }).catch(console.error);
  }, [refreshThreads]);

  const retryThreads = () => {
    refreshThreads({ force: true }).catch(console.error);
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="-ml-2 self-start"
        aria-label="Go back"
      >
        <ArrowLeft className="size-4" />
        <span>Back</span>
      </Button>

      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">History</h1>
        <p className="text-muted-foreground text-base">
          Search your past conversations.
        </p>
        <div className="relative max-w-md">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search conversations…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-11 border-2 border-gray-500 pl-9 placeholder:text-gray-300"
          />
        </div>
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
      <AppShell mainClassName="overflow-y-auto">
        <HistoryContent />
      </AppShell>
    </React.Suspense>
  );
}
