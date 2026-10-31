"use client";

import { Thread } from "@/components/thread";
import { StreamProvider } from "@/providers/Stream";
import { ResearchFocusProvider } from "@/components/thread/research-context";
import { Toaster } from "@/components/ui/sonner";
import React from "react";

export default function DemoPage(): React.ReactNode {
  return (
    <React.Suspense fallback={<div>Loading (layout)...</div>}>
      <Toaster />
      <StreamProvider>
        <ResearchFocusProvider>
          <Thread />
        </ResearchFocusProvider>
      </StreamProvider>
    </React.Suspense>
  );
}
