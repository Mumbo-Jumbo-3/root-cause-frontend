"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Loader2,
  Minus,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  TIMELINE_SPEC,
  findEvidence,
  summarizeTimeline,
  type Stage,
  type StageTimelineState,
  type StageStatus,
} from "@/hooks/use-stage-timeline";
import { useResearchFocus } from "../research-context";
import {
  StageDetailView,
  stageHasDetail,
  type ResearchFocusTarget,
} from "./research-detail";

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
    <span className="bg-background/60 text-muted-foreground ml-auto rounded-md px-2 py-0.5 font-mono text-xs">
      {children}
    </span>
  );
}

function StatusIcon({ status }: { status: StageStatus }) {
  const common = "h-4 w-4 shrink-0";
  if (status === "running") {
    return (
      <Loader2
        className={cn(common, "text-primary animate-spin")}
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
        "border-muted-foreground/30 rounded-full border bg-transparent",
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
  const findings = typeof meta.findings === "number" ? meta.findings : 0;
  const posts = typeof meta.posts === "number" ? meta.posts : 0;

  if (
    id === "trusted_search" ||
    id === "womens_health_search" ||
    id === "unrestricted_search"
  ) {
    const parts: string[] = [];
    if (findings) parts.push(`${findings} findings`);
    if (posts) parts.push(`${posts} posts`);
    return parts.join(" · ") || null;
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

/** Conditional steps only appear once they actually run. */
function isHidden(stage: Stage): boolean {
  return Boolean(
    stage.conditional &&
    (stage.status === "pending" || stage.status === "skipped"),
  );
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
    if (isHidden(stage)) continue;

    rows.push({
      stage,
      isChild: false,
      isFirstChild: false,
      isLastChild: false,
    });
    seen.add(spec.id);

    const childIds = (childrenBySpec[spec.id] ?? []).filter(
      (childId) => state.stages[childId] && !isHidden(state.stages[childId]),
    );
    childIds.forEach((childId, idx) => {
      const childStage = state.stages[childId];
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

/** The newest step with details; live runs keep it open as they progress. */
function latestDetailedStage(state: StageTimelineState): string | null {
  let latest: Stage | null = null;
  for (const stage of Object.values(state.stages)) {
    if (stage.completedAt === undefined || !stageHasDetail(stage)) continue;
    if (!latest || stage.completedAt >= (latest.completedAt ?? 0))
      latest = stage;
  }
  return latest?.id ?? null;
}

// Card, step and item each animate open (~250ms apiece) before the target settles.
const SCROLL_AFTER_EXPAND_MS = 550;
const FOCUS_HIGHLIGHT_MS = 2600;

export function StageTimeline({
  state,
  turn,
  defaultCollapsed,
  initialCollapsed,
}: {
  state: StageTimelineState;
  turn: number;
  defaultCollapsed: boolean;
  initialCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(
    initialCollapsed ?? defaultCollapsed,
  );
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  // Follow the newest step until the user opens or closes one themselves.
  const [following, setFollowing] = useState(true);
  const [focus, setFocus] = useState<ResearchFocusTarget | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { request } = useResearchFocus();

  // Auto-collapse once the run winds down to a stable summary form.
  useEffect(() => {
    setCollapsed(defaultCollapsed);
    if (defaultCollapsed) setExpanded(new Set());
  }, [defaultCollapsed]);

  const live = Boolean(state.startedAt !== null && !state.completedAt);
  const latest = useMemo(() => latestDetailedStage(state), [state]);
  useEffect(() => {
    if (live && following && latest) setExpanded(new Set([latest]));
  }, [live, following, latest]);

  // A citation in this turn's answer asked to reveal its evidence.
  useEffect(() => {
    if (!request || request.turn !== turn) return;
    const evidence = findEvidence(state, request.target.id);
    if (!evidence) return;
    setFollowing(false);
    setCollapsed(false);
    setExpanded((prev) => new Set(prev).add(evidence.stageId));
    setFocus(request.target);
    const scroll = window.setTimeout(() => {
      const target = rootRef.current?.querySelector(
        `[data-evidence="${CSS.escape(request.target.id)}"]`,
      );
      if (!target) return;
      // Smooth-scrolling across a long answer takes seconds; jump instead.
      const far =
        Math.abs(target.getBoundingClientRect().top) > window.innerHeight * 2;
      target.scrollIntoView({
        behavior: far ? "auto" : "smooth",
        block: "start",
      });
    }, SCROLL_AFTER_EXPAND_MS);
    const clear = window.setTimeout(() => setFocus(null), FOCUS_HIGHLIGHT_MS);
    return () => {
      window.clearTimeout(scroll);
      window.clearTimeout(clear);
    };
    // Only react to new jump requests, not to trace updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

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

  const toggleStage = (id: string) => {
    setFollowing(false);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      ref={rootRef}
      layout="position"
      className="bg-muted/70 w-full max-w-xl rounded-2xl px-3 py-2 text-base"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="text-muted-foreground hover:bg-background/40 hover:text-foreground flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors"
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
              const expandable = stageHasDetail(stage);
              const open = expandable && expanded.has(stage.id);
              const header = (
                <>
                  {isChild && (
                    <span
                      aria-hidden
                      className="text-muted-foreground/60 font-mono"
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
                      <span className="text-muted-foreground truncate text-sm">
                        {stage.description}
                      </span>
                    )}
                  </div>
                  {pill && <MetaPill>{pill}</MetaPill>}
                  {expandable && (
                    <motion.span
                      animate={{ rotate: open ? 90 : 0 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "text-muted-foreground",
                        !pill && "ml-auto",
                      )}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </motion.span>
                  )}
                </>
              );
              return (
                <motion.li
                  key={stage.id}
                  layout="position"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: dimmed ? 0.55 : 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={cn("flex flex-col", isChild && "ml-4")}
                >
                  {expandable ? (
                    <button
                      type="button"
                      onClick={() => toggleStage(stage.id)}
                      aria-expanded={open}
                      className="hover:bg-background/40 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                    >
                      {header}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
                      {header}
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key="detail"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div
                          className={cn(
                            "pt-1 pr-1 pb-3",
                            isChild ? "pl-10" : "pl-8",
                          )}
                        >
                          <StageDetailView
                            stage={stage}
                            docs={state.docs}
                            focus={focus}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
