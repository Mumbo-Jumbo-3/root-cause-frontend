"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";

import type { Thread } from "@/lib/agent-types";

export type ThreadsStatus = "idle" | "loading" | "success" | "error";

type RefreshThreadsOptions = {
  force?: boolean;
  silent?: boolean;
};

interface ThreadContextType {
  threads: Thread[];
  threadsStatus: ThreadsStatus;
  threadsError: string | null;
  refreshThreads: (options?: RefreshThreadsOptions) => Promise<Thread[]>;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

export function ThreadProvider({ children }: { children: ReactNode }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const [threadsState, setThreadsState] = useState<Thread[]>([]);
  const [threadsStatusState, setThreadsStatusState] =
    useState<ThreadsStatus>("idle");
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const threadsRef = useRef<Thread[]>([]);
  const threadsStatusRef = useRef<ThreadsStatus>("idle");
  const requestIdRef = useRef(0);
  const inFlightRef = useRef<Promise<Thread[]> | null>(null);

  const setThreads = useCallback((threads: Thread[]) => {
    threadsRef.current = threads;
    setThreadsState(threads);
  }, []);

  const setThreadsStatus = useCallback((status: ThreadsStatus) => {
    threadsStatusRef.current = status;
    setThreadsStatusState(status);
  }, []);

  const refreshThreads = useCallback(
    async (options: RefreshThreadsOptions = {}) => {
      const { force = false, silent = false } = options;

      if (!force) {
        if (threadsStatusRef.current === "success") {
          return threadsRef.current;
        }
        if (inFlightRef.current) {
          return inFlightRef.current;
        }
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (!silent || threadsStatusRef.current !== "success") {
        setThreadsStatus("loading");
      }
      setThreadsError(null);

      const request = (async () => {
        try {
          if (!apiUrl) {
            throw new Error("Thread history API URL is not configured");
          }

          const res = await fetch(`${apiUrl}/threads/search`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ limit: 100 }),
            cache: "no-store",
          });

          if (!res.ok) {
            throw new Error(`Could not load history (status ${res.status})`);
          }

          const payload = await res.json();
          if (!Array.isArray(payload)) {
            throw new Error("Invalid thread history response");
          }

          const threads = payload as Thread[];
          if (requestIdRef.current === requestId) {
            setThreads(threads);
            setThreadsStatus("success");
            setThreadsError(null);
          }
          return threads;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (requestIdRef.current === requestId) {
            setThreadsStatus("error");
            setThreadsError(message);
          }
          throw err;
        } finally {
          if (requestIdRef.current === requestId) {
            inFlightRef.current = null;
          }
        }
      })();

      inFlightRef.current = request;
      return request;
    },
    [apiUrl, setThreads, setThreadsStatus],
  );

  const value = useMemo(
    () => ({
      threads: threadsState,
      threadsStatus: threadsStatusState,
      threadsError,
      refreshThreads,
    }),
    [refreshThreads, threadsError, threadsState, threadsStatusState],
  );

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThreads must be used within a ThreadProvider");
  }
  return context;
}
