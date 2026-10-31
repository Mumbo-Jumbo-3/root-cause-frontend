"use client";

import { useContext, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";

import type { CitationRef } from "@/lib/agent-types";
import {
  TIMELINE_SPEC,
  findEvidence,
  type Evidence,
  type StageTimelineState,
} from "@/hooks/use-stage-timeline";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TurnResearchContext,
  useResearchFocus,
  type ResolvedCitation,
} from "../research-context";

export const CITE_HREF_PREFIX = "#cite-";

/** Map live `document_index` citations through the synthesize step's evidence order. */
export function resolveCitations(
  citations: CitationRef[] | undefined,
  timeline: StageTimelineState | null,
): ResolvedCitation[] {
  const evidence = timeline?.stages["synthesize"]?.detail?.evidence ?? [];
  const resolved: ResolvedCitation[] = [];
  for (const c of citations ?? []) {
    const evidenceId =
      c.evidence_id ??
      (c.document_index !== undefined ? evidence[c.document_index] : undefined);
    if (evidenceId)
      resolved.push({ offset: c.offset, evidenceId, quote: c.quote });
  }
  return resolved;
}

const TRAILING_PUNCTUATION = /[.,;:!?)\]*_"'”’]/;

/** Anchor after the sentence's closing punctuation, before any trailing whitespace. */
function anchorOffset(text: string, offset: number): number {
  let i = Math.min(Math.max(offset, 0), text.length);
  while (i > 0 && /\s/.test(text[i - 1])) i--;
  while (i < text.length && TRAILING_PUNCTUATION.test(text[i])) i++;
  return i;
}

/**
 * Insert `[n](#cite-k)` links where cited passages end. `k` indexes `citations`
 * so each chip shows its own quote; `n` numbers evidence by first appearance.
 */
export function buildCitedMarkdown(
  text: string,
  citations: ResolvedCitation[],
): { markdown: string; order: string[] } {
  if (citations.length === 0) return { markdown: text, order: [] };
  const anchored = citations
    .map((c, k) => ({
      k,
      evidenceId: c.evidenceId,
      at: anchorOffset(text, c.offset),
    }))
    .sort((a, b) => a.at - b.at || a.k - b.k);

  const order: string[] = [];
  let markdown = "";
  let cursor = 0;
  let i = 0;
  while (i < anchored.length) {
    const at = anchored[i].at;
    markdown += text.slice(cursor, at);
    cursor = at;
    const seen = new Set<string>();
    for (; i < anchored.length && anchored[i].at === at; i++) {
      const { k, evidenceId } = anchored[i];
      if (seen.has(evidenceId)) continue;
      seen.add(evidenceId);
      if (!order.includes(evidenceId)) order.push(evidenceId);
      markdown += `[${order.indexOf(evidenceId) + 1}](${CITE_HREF_PREFIX}${k})`;
    }
  }
  markdown += text.slice(cursor);
  return { markdown, order };
}

function stageLabel(stageId: string): string {
  return TIMELINE_SPEC.find((s) => s.id === stageId)?.label ?? "";
}

function evidenceSummary(evidence: Evidence): {
  title: string;
  subtitle: string;
  url?: string;
} {
  if (evidence.kind === "doc") {
    const { doc } = evidence;
    return {
      title: doc.title,
      subtitle: [doc.author, doc.section.join(" › ")]
        .filter(Boolean)
        .join(" · "),
    };
  }
  const { finding, stageId } = evidence;
  return {
    title: finding.handles.length
      ? finding.handles.map((h) => `@${h}`).join(", ")
      : stageLabel(stageId),
    subtitle: finding.handles.length ? stageLabel(stageId) : "",
    url: finding.source_urls[0],
  };
}

function EvidenceIcon({ evidence }: { evidence: Evidence }) {
  if (evidence.kind === "doc") {
    return <BookOpen className="text-muted-foreground h-3.5 w-3.5 shrink-0" />;
  }
  return (
    <span className="text-muted-foreground w-3.5 shrink-0 text-center text-xs leading-none font-semibold">
      𝕏
    </span>
  );
}

const CLOSE_DELAY_MS = 150;

export function CitationChip({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  const research = useContext(TurnResearchContext);
  const { jumpTo } = useResearchFocus();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);

  const cite = research?.citations[index];
  const evidence =
    cite && research?.timeline
      ? findEvidence(research.timeline, cite.evidenceId)
      : null;
  if (!research || !cite) return <>{children}</>;

  const number = research.order.indexOf(cite.evidenceId) + 1;
  const summary = evidence ? evidenceSummary(evidence) : null;
  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(
      () => setOpen(false),
      CLOSE_DELAY_MS,
    );
  };
  const jump = () => {
    setOpen(false);
    if (evidence) jumpTo(research.turn, cite.evidenceId, cite.quote);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            summary ? `Source ${number}: ${summary.title}` : `Source ${number}`
          }
          className="bg-primary/15 text-primary hover:bg-primary/30 relative -top-[0.45em] mx-px inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-md px-1 align-baseline font-mono text-[0.68rem] leading-none no-underline transition-colors"
          onPointerEnter={(e) => {
            if (e.pointerType !== "mouse") return;
            cancelClose();
            setOpen(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") scheduleClose();
          }}
          onClick={(e) => {
            // Mouse: hover shows the card, click jumps. Touch/keyboard: toggle the card.
            e.preventDefault();
            if ((e.nativeEvent as PointerEvent).pointerType === "mouse") jump();
            else setOpen((v) => !v);
          }}
        >
          {number}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={cancelClose}
        onPointerLeave={scheduleClose}
      >
        {summary && evidence ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5">
                <EvidenceIcon evidence={evidence} />
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-snug font-medium">
                  {summary.title}
                </p>
                {summary.subtitle && (
                  <p className="text-foreground/55 truncate text-xs">
                    {summary.subtitle}
                  </p>
                )}
              </div>
            </div>
            {cite.quote && (
              <blockquote className="border-primary/50 text-foreground/85 line-clamp-5 border-l-2 pl-2.5 text-sm leading-relaxed">
                {cite.quote}
              </blockquote>
            )}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={jump}
                className="text-primary flex items-center gap-1 text-sm hover:underline"
              >
                View in research <ArrowRight className="h-3.5 w-3.5" />
              </button>
              {summary.url && (
                <a
                  href={summary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                >
                  Open post <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Source details are unavailable.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Numbered list of the evidence this answer actually cites. */
export function SourcesList() {
  const research = useContext(TurnResearchContext);
  const { jumpTo } = useResearchFocus();
  if (!research?.timeline || research.order.length === 0) return null;
  const timeline = research.timeline;

  return (
    <div className="border-border/60 mt-2 border-t pt-3">
      <p className="text-muted-foreground/80 mb-2 text-xs tracking-wide uppercase">
        Sources
      </p>
      <ol className="flex flex-col gap-1">
        {research.order.map((id, i) => {
          const evidence = findEvidence(timeline, id);
          if (!evidence) return null;
          const summary = evidenceSummary(evidence);
          const quote = research.citations.find(
            (c) => c.evidenceId === id,
          )?.quote;
          return (
            <li
              key={id}
              className="flex items-start gap-2"
            >
              <button
                type="button"
                onClick={() => jumpTo(research.turn, id, quote)}
                className="group flex min-w-0 flex-1 items-start gap-2 rounded-md py-0.5 text-left"
              >
                <span className="bg-primary/15 text-primary mt-0.5 inline-flex h-[1.1rem] min-w-[1.1rem] shrink-0 items-center justify-center rounded-md px-1 font-mono text-[0.68rem]">
                  {i + 1}
                </span>
                <span className="mt-0.5">
                  <EvidenceIcon evidence={evidence} />
                </span>
                <span className="min-w-0 text-sm leading-snug">
                  <span className="line-clamp-2 group-hover:underline">
                    {summary.title}
                  </span>
                  <span className="text-foreground/55 mt-0.5 line-clamp-1 block text-xs">
                    {evidence.kind === "finding"
                      ? evidence.finding.claim
                      : summary.subtitle}
                  </span>
                </span>
              </button>
              {summary.url && (
                <a
                  href={summary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open post on X"
                  className="text-muted-foreground hover:text-foreground mt-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
