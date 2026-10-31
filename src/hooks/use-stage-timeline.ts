"use client";

import { useCallback, useReducer } from "react";

import type { ResearchTrace } from "@/lib/agent-types";

export type StageStatus =
  | "pending"
  | "running"
  | "completed"
  | "skipped"
  | "error";

export interface StageSpec {
  id: string;
  label: string;
  description?: string;
  parentId?: string;
  conditional?: boolean;
}

/** One claim distilled from X posts by a Grok search step. */
export interface Finding {
  id: string;
  claim: string;
  relevance: string;
  source_urls: string[];
  handles: string[];
  /** Posts linked by text similarity rather than cited by Grok. */
  matched?: boolean;
}

/** A curated-archive chunk; shared by every step that retrieved it. */
export interface DocInfo {
  id: string;
  title: string;
  author: string;
  section: string[];
  text: string;
}

export interface DocHit {
  id: string;
  /** Rerank score after merging, vector similarity before. 0–1. */
  score?: number | null;
  origin?: "base" | "expanded" | "both";
  queries?: string[];
}

export interface StageDetail {
  findings?: Finding[];
  /** X posts the search read (verified by xAI), for steps whose findings lack links. */
  posts?: string[];
  queries?: string[];
  hits?: DocHit[];
  sufficient?: boolean;
  reason?: string;
  /** Synthesize step: evidence ids in the order Claude received them. */
  evidence?: string[];
}

export interface Stage extends StageSpec {
  status: StageStatus;
  meta: Record<string, string | number | boolean>;
  detail?: StageDetail;
  startedAt?: number;
  completedAt?: number;
}

export type StageMetaValue = string | number | boolean;

export interface PhaseEvent {
  phase: string;
  status: "started" | "completed";
  meta?: Record<string, StageMetaValue>;
  detail?: StageDetail & { docs?: Record<string, DocInfo> };
}

export interface StageTimelineSummary {
  elapsedMs: number;
  sources: number;
  docs: number;
  sufficient?: boolean;
  unrestrictedUsed: boolean;
}

export const TIMELINE_SPEC: StageSpec[] = [
  { id: "search_group", label: "Searching" },
  {
    id: "trusted_search",
    parentId: "search_group",
    label: "Trusted X accounts",
    description: "Curated handles aligned with the research archive",
  },
  {
    id: "womens_health_search",
    parentId: "search_group",
    label: "Trusted women's-health accounts",
    description: "Curated handles focused on female physiology",
    conditional: true,
  },
  {
    id: "rag_base",
    parentId: "search_group",
    label: "Curated research archive",
    description: "Vector + keyword retrieval against your question",
  },
  {
    id: "rag_enrich",
    label: "Expanding with refined queries",
    description: "Retrieval on queries generated from trusted posts",
  },
  {
    id: "rag_merge",
    label: "Ranking and merging evidence",
    description: "Reciprocal-rank fusion and cross-encoder rerank",
  },
  {
    id: "gate",
    label: "Judging sufficiency",
    description: "Deciding whether the evidence is complete",
  },
  {
    id: "unrestricted_search",
    label: "Broader X search",
    description: "Reaching beyond trusted accounts to fill gaps",
    conditional: true,
  },
  {
    id: "synthesize",
    label: "Writing the answer",
    description: "Composing a grounded response",
  },
];

const STATUS_COMPLETED_SET = new Set<string>(["success", "empty"]);

export interface StageTimelineState {
  stages: Record<string, Stage>;
  docs: Record<string, DocInfo>;
  startedAt: number | null;
  completedAt: number | null;
  order: string[];
  hasAny: boolean;
  unrestrictedUsed: boolean;
}

export type StageTimelineAction =
  | { type: "reset" }
  | { type: "phase"; event: PhaseEvent; now?: number }
  | { type: "mark_completed_all"; now?: number };

function buildInitial(): StageTimelineState {
  const stages: Record<string, Stage> = {};
  const order: string[] = [];
  for (const spec of TIMELINE_SPEC) {
    stages[spec.id] = {
      ...spec,
      status: "pending",
      meta: {},
    };
    order.push(spec.id);
  }
  return {
    stages,
    docs: {},
    startedAt: null,
    completedAt: null,
    order,
    hasAny: false,
    unrestrictedUsed: false,
  };
}

function resolveCompletedStatus(meta: Record<string, StageMetaValue>): StageStatus {
  const status = meta?.status;
  if (typeof status === "string") {
    if (status === "error") return "error";
    if (status === "skipped") return "skipped";
    if (STATUS_COMPLETED_SET.has(status)) return "completed";
  }
  return "completed";
}

function recomputeGroup(state: StageTimelineState): StageTimelineState {
  const group = state.stages["search_group"];
  if (!group) return state;
  const children = TIMELINE_SPEC.filter((s) => s.parentId === "search_group")
    .map((s) => state.stages[s.id])
    .filter(Boolean);
  if (children.length === 0) return state;

  let nextStatus: StageStatus = group.status;
  const statuses = children.map((c) => c.status);
  if (statuses.some((s) => s === "running")) {
    nextStatus = "running";
  } else if (
    statuses.every((s) => s === "completed" || s === "skipped" || s === "error")
  ) {
    nextStatus =
      statuses.some((s) => s === "error") && !statuses.some((s) => s === "completed")
        ? "error"
        : "completed";
  } else if (statuses.some((s) => s === "pending")) {
    nextStatus = statuses.some((s) => s === "completed" || s === "error") ? "running" : "pending";
  }

  if (nextStatus === group.status) return state;
  return {
    ...state,
    stages: {
      ...state.stages,
      search_group: { ...group, status: nextStatus },
    },
  };
}

export function stageTimelineReducer(
  state: StageTimelineState,
  action: StageTimelineAction,
): StageTimelineState {
  switch (action.type) {
    case "reset":
      return buildInitial();
    case "phase": {
      const { event } = action;
      const now = action.now ?? Date.now();
      const existing = state.stages[event.phase];
      if (!existing) return state;

      const nextStages = { ...state.stages };
      let nextStatus: StageStatus = existing.status;
      let startedAt = existing.startedAt;
      let completedAt = existing.completedAt;
      let unrestrictedUsed = state.unrestrictedUsed;

      if (event.status === "started") {
        nextStatus = "running";
        startedAt = startedAt ?? now;
        if (event.phase === "unrestricted_search") unrestrictedUsed = true;
      } else if (event.status === "completed") {
        nextStatus = resolveCompletedStatus(event.meta ?? {});
        completedAt = now;
        startedAt = startedAt ?? now;
      }

      const { docs, ...detail } = event.detail ?? {};
      nextStages[event.phase] = {
        ...existing,
        status: nextStatus,
        meta: { ...existing.meta, ...(event.meta ?? {}) },
        detail: event.detail
          ? { ...existing.detail, ...detail }
          : existing.detail,
        startedAt,
        completedAt,
      };

      let next: StageTimelineState = {
        ...state,
        stages: nextStages,
        docs: docs ? { ...state.docs, ...docs } : state.docs,
        hasAny: true,
        startedAt: state.startedAt ?? now,
        unrestrictedUsed,
      };
      if (event.phase === "synthesize" && event.status === "started") {
        next = { ...next, completedAt: next.completedAt ?? now };
      }
      return recomputeGroup(next);
    }
    case "mark_completed_all": {
      const now = action.now ?? Date.now();
      const stages = { ...state.stages };
      for (const id of Object.keys(stages)) {
        const stage = stages[id];
        if (stage.status === "running" || stage.status === "pending") {
          stages[id] = {
            ...stage,
            status: stage.status === "pending" ? "pending" : "completed",
            completedAt: stage.completedAt ?? now,
          };
        }
      }
      return recomputeGroup({
        ...state,
        stages,
        completedAt: state.completedAt ?? now,
      });
    }
    default:
      return state;
  }
}

function numberMeta(meta: Record<string, StageMetaValue>, key: string): number {
  const v = meta[key];
  return typeof v === "number" ? v : 0;
}

export function summarizeTimeline(
  state: StageTimelineState,
): StageTimelineSummary {
  const end = state.completedAt ?? Date.now();
  const elapsedMs =
    state.startedAt !== null ? Math.max(0, end - state.startedAt) : 0;

  const searchIds = [
    "trusted_search",
    "womens_health_search",
    "rag_base",
    "rag_enrich",
    "unrestricted_search",
  ];
  const sources = searchIds.filter((id) => {
    const s = state.stages[id];
    return s && (s.status === "completed") && numberMeta(s.meta, "docs") + numberMeta(s.meta, "findings") > 0;
  }).length;

  const docs = numberMeta(state.stages["rag_merge"]?.meta ?? {}, "docs");
  const gateMeta = state.stages["gate"]?.meta ?? {};
  const sufficient =
    typeof gateMeta.sufficient === "boolean" ? gateMeta.sufficient : undefined;

  return {
    elapsedMs,
    sources,
    docs,
    sufficient,
    unrestrictedUsed: state.unrestrictedUsed,
  };
}

/** Rebuild a finished run's timeline from the trace saved on its answer. */
export function timelineFromTrace(trace: ResearchTrace): StageTimelineState {
  let state = buildInitial();
  for (const event of trace.events) {
    state = stageTimelineReducer(state, {
      type: "phase",
      event: event as PhaseEvent,
      now: 0,
    });
  }
  return { ...state, startedAt: 0, completedAt: trace.elapsed_ms };
}

const traceTimelines = new WeakMap<ResearchTrace, StageTimelineState>();

/** `timelineFromTrace`, memoized per saved trace so re-renders reuse it. */
export function cachedTimelineFromTrace(
  trace: ResearchTrace,
): StageTimelineState {
  let state = traceTimelines.get(trace);
  if (!state) {
    state = timelineFromTrace(trace);
    traceTimelines.set(trace, state);
  }
  return state;
}

export type Evidence =
  | { kind: "finding"; stageId: string; finding: Finding }
  | { kind: "doc"; stageId: string; doc: DocInfo; hit?: DocHit };

const FINDING_STAGES = [
  "trusted_search",
  "womens_health_search",
  "unrestricted_search",
];

/** Resolve a citation's evidence id to the trace item and the step that shows it. */
export function findEvidence(
  state: StageTimelineState,
  id: string,
): Evidence | null {
  for (const stageId of FINDING_STAGES) {
    const finding = state.stages[stageId]?.detail?.findings?.find(
      (f) => f.id === id,
    );
    if (finding) return { kind: "finding", stageId, finding };
  }
  const doc = state.docs[id];
  if (!doc) return null;
  // Cited docs are always in the merged set fed to the answer.
  const hit = state.stages["rag_merge"]?.detail?.hits?.find((h) => h.id === id);
  return { kind: "doc", stageId: "rag_merge", doc, hit };
}

export interface StageTimelineHandle {
  state: StageTimelineState;
  applyPhase: (event: PhaseEvent) => void;
  reset: () => void;
  finalize: () => void;
}

export function useStageTimeline(): StageTimelineHandle {
  const [state, dispatch] = useReducer(stageTimelineReducer, undefined, buildInitial);

  const applyPhase = useCallback((event: PhaseEvent) => {
    dispatch({ type: "phase", event });
  }, []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const finalize = useCallback(() => dispatch({ type: "mark_completed_all" }), []);

  return { state, applyPhase, reset, finalize };
}
