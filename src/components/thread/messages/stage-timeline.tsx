"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Loader2, Minus, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  TIMELINE_SPEC,
  summarizeTimeline,
  type Stage,
  type StageTimelineState,
  type StageStatus,
} from "@/hooks/use-stage-timeline";

function formatElapsed(ms: number): string {
  if (!ms || ms < 1000) return "<1s";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-auto rounded-md bg-background/60 px-2 py-0.5 font-mono text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function StatusIcon({ status }: { status: StageStatus }) {
  const common = "h-4 w-4 shrink-0";
  if (status === "running") {
    return (
      <Loader2
        className={cn(common, "animate-spin text-primary")}
        strokeWidth={2.25}
      />
    );
  }
  if (status === "completed") {
    return (
      <Check
        className={cn(common, "text-emerald-500")}
        strokeWidth={2.5}
      />
    );
  }
  if (status === "skipped") {
    return <Minus className={cn(common, "text-muted-foreground/60")} />;
  }
  if (status === "error") {
    return <AlertTriangle className={cn(common, "text-amber-500")} />;
  }
  return (
    <span
      className={cn(
        common,
        "rounded-full border border-muted-foreground/30 bg-transparent",
      )}
    />
  );
}

function metaLabel(stage: Stage): string | null {
  const { meta, id, status } = stage;
  if (status === "pending" || status === "running") return null;

  if (id === "gate") {
    if (typeof meta.sufficient === "boolean") {
      return meta.sufficient ? "sufficient ✓" : "gaps found";
    }
    return null;
  }
  if (status === "skipped") return "skipped";
  if (status === "error") return "error";

  const docs = typeof meta.docs === "number" ? meta.docs : 0;
  const posts = typeof meta.posts === "number" ? meta.posts : 0;
  const refined =
    typeof meta.refined_queries === "number" ? meta.refined_queries : 0;

  if (id === "trusted_search") {
    const parts: string[] = [];
    if (posts) parts.push(`${posts} posts`);
    if (refined) parts.push(`${refined} queries`);
    return parts.join(" · ") || null;
  }
  if (id === "unrestricted_search") {
    return posts ? `${posts} posts` : null;
  }
  if (id === "rag_base" || id === "rag_enrich" || id === "rag_merge") {
    return docs ? `${docs} docs` : null;
  }
  return null;
}

interface OrderedRow {
  stage: Stage;
  isChild: boolean;
  isFirstChild: boolean;
  isLastChild: boolean;
}

function buildRows(state: StageTimelineState): OrderedRow[] {
  const childrenBySpec: Record<string, string[]> = {};
  for (const spec of TIMELINE_SPEC) {
    if (spec.parentId) {
      (childrenBySpec[spec.parentId] ||= []).push(spec.id);
    }
  }

  const rows: OrderedRow[] = [];
  const seen = new Set<string>();
  for (const spec of TIMELINE_SPEC) {
    if (spec.parentId) continue;
    const stage = state.stages[spec.id];
    if (!stage) continue;
    if (spec.conditional && stage.status === "pending") continue;

    rows.push({ stage, isChild: false, isFirstChild: false, isLastChild: false });
    seen.add(spec.id);

    const childIds = childrenBySpec[spec.id] ?? [];
    childIds.forEach((childId, idx) => {
      const childStage = state.stages[childId];
      if (!childStage) return;
      rows.push({
        stage: childStage,
        isChild: true,
        isFirstChild: idx === 0,
        isLastChild: idx === childIds.length - 1,
      });
      seen.add(childId);
    });
  }
  return rows;
}

export function StageTimeline({
  state,
  defaultCollapsed,
  initialCollapsed,
}: {
  state: StageTimelineState;
  defaultCollapsed: boolean;
  initialCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed ?? defaultCollapsed);

  // Auto-collapse once the run winds down to a stable summary form.
  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  const [elapsedTick, setElapsedTick] = useState(0);
  useEffect(() => {
    if (state.completedAt || !state.startedAt) return;
    const id = window.setInterval(() => setElapsedTick((t) => t + 1), 500);
    return () => window.clearInterval(id);
  }, [state.startedAt, state.completedAt]);

  const summary = useMemo(
    () => summarizeTimeline(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, elapsedTick],
  );

  const rows = useMemo(() => buildRows(state), [state]);

  if (!state.hasAny) return null;

  const summaryBits: string[] = [];
  summaryBits.push(
    `${state.completedAt ? "Researched" : "Researching"} in ${formatElapsed(summary.elapsedMs)}`,
  );
  if (summary.sources) summaryBits.push(`${summary.sources} sources`);
  if (summary.docs) summaryBits.push(`${summary.docs} docs`);
  if (summary.sufficient === true) summaryBits.push("sufficient ✓");
  if (summary.sufficient === false && summary.unrestrictedUsed) {
    summaryBits.push("broadened search");
  }

  return (
    <motion.div
      layout
      className="w-full max-w-xl rounded-2xl bg-muted/70 px-3 py-2 text-base"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-muted-foreground transition-colors hover:bg-background/40 hover:text-foreground"
        aria-expanded={!collapsed}
      >
        <motion.span
          animate={{ rotate: collapsed ? 0 : 90 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex items-center"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.span>
        <span className="text-sm">{summaryBits.join(" · ")}</span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.ul
            key="rows"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-1 flex flex-col gap-1 overflow-hidden px-1 pb-1"
          >
            {rows.map(({ stage, isChild, isLastChild }) => {
              const pill = metaLabel(stage);
              const dimmed =
                stage.status === "pending" || stage.status === "skipped";
              return (
                <motion.li
                  key={stage.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: dimmed ? 0.55 : 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5",
                    isChild && "ml-4",
                  )}
                >
                  {isChild && (
                    <span
                      aria-hidden
                      className="font-mono text-muted-foreground/60"
                    >
                      {isLastChild ? "└" : "├"}
                    </span>
                  )}
                  <StatusIcon status={stage.status} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        "truncate text-base font-medium",
                        dimmed && "font-normal",
                      )}
                    >
                      {stage.label}
                    </span>
                    {stage.description && (
                      <span className="truncate text-sm text-muted-foreground">
                        {stage.description}
                      </span>
                    )}
                  </div>
                  {pill && <MetaPill>{pill}</MetaPill>}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
