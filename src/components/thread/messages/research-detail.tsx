"use client";

import { Component, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ExternalLink } from "lucide-react";
import { Tweet, TweetSkeleton } from "react-tweet";

import { cn } from "@/lib/utils";
import type {
  DocHit,
  DocInfo,
  Finding,
  Stage,
} from "@/hooks/use-stage-timeline";

/** The trace item a citation jumped to; `nonce` re-triggers repeat jumps. */
export interface ResearchFocusTarget {
  id: string;
  quote?: string;
  nonce: number;
}

const FINDINGS_PREVIEW = 3;
const POSTS_PREVIEW = 2;
const DOCS_PREVIEW = 3;
const MERGED_PREVIEW = 5;
const EXCERPT_CLAMP_CHARS = 220;

export function stageHasDetail(stage: Stage): boolean {
  const d = stage.detail;
  if (!d || stage.status !== "completed") return false;
  if (stage.id === "gate") return Boolean(d.reason);
  return Boolean(
    d.findings?.length ||
    d.posts?.length ||
    d.queries?.length ||
    d.hits?.length,
  );
}

export function tweetStatusId(url: string): string | null {
  return url.match(/\/status(?:es)?\/(\d+)/)?.[1] ?? null;
}

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** Wrap the quoted passage in a <mark>, tolerating whitespace differences. */
export function highlightQuote(text: string, quote?: string): ReactNode {
  const words = quote?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return text;
  const pattern = words
    .map((w) => w.replace(REGEX_SPECIAL, "\\$&"))
    .join("\\s+");
  const match = new RegExp(pattern).exec(text);
  if (!match) return text;
  const end = match.index + match[0].length;
  return (
    <>
      {text.slice(0, match.index)}
      <mark className="bg-primary/25 text-foreground rounded-sm px-0.5">
        {match[0]}
      </mark>
      {text.slice(end)}
    </>
  );
}

/** Calls `onFocus` once per new jump request (state adjusted during render). */
function useOnNewFocus(
  focus: ResearchFocusTarget | null,
  onFocus: (target: ResearchFocusTarget) => void,
) {
  const [seenNonce, setSeenNonce] = useState<number | null>(null);
  if (focus && focus.nonce !== seenNonce) {
    setSeenNonce(focus.nonce);
    onFocus(focus);
  }
}

/** "Show all" state that opens itself when a jump targets a hidden item. */
function useFocusReveal(
  ids: string[],
  preview: number,
  focus: ResearchFocusTarget | null,
) {
  const [showAll, setShowAll] = useState(false);
  useOnNewFocus(focus, (target) => {
    if (ids.indexOf(target.id) >= preview) setShowAll(true);
  });
  return [showAll, setShowAll] as const;
}

function ShowAllButton({
  showAll,
  total,
  noun,
  onClick,
}: {
  showAll: boolean;
  total: number;
  noun: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-primary self-start rounded-md px-1 text-sm hover:underline"
    >
      {showAll ? "Show fewer" : `Show all ${total} ${noun}`}
    </button>
  );
}

function QueryChips({ queries }: { queries: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground/80 text-xs tracking-wide uppercase">
        Refined queries
      </span>
      <div className="flex flex-wrap gap-1.5">
        {queries.map((q) => (
          <span
            key={q}
            className="bg-background/60 text-foreground/85 rounded-full px-2.5 py-0.5 font-mono text-xs"
          >
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}

function TweetFallbackLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-background/40 text-primary flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:underline"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      View post on X
    </a>
  );
}

/** Keeps one malformed tweet from taking down the whole trace. */
class TweetBoundary extends Component<
  { url: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("Tweet embed failed", this.props.url, error);
  }
  render() {
    if (this.state.failed) return <TweetFallbackLink url={this.props.url} />;
    return this.props.children;
  }
}

function TweetEmbed({ url }: { url: string }) {
  const id = tweetStatusId(url);
  if (!id) return <TweetFallbackLink url={url} />;
  return (
    <div className="research-tweet">
      <TweetBoundary url={url}>
        <Tweet
          id={id}
          apiUrl={`/api/tweet/${id}`}
          fallback={<TweetSkeleton />}
          components={{ TweetNotFound: () => <TweetFallbackLink url={url} /> }}
        />
      </TweetBoundary>
    </div>
  );
}

function FindingRow({
  finding,
  open,
  onToggle,
  focus,
  stepHasPosts,
}: {
  finding: Finding;
  open: boolean;
  onToggle: () => void;
  focus: ResearchFocusTarget | null;
  stepHasPosts: boolean;
}) {
  const focused = focus?.id === finding.id;
  const posts = finding.source_urls.length;
  return (
    <li
      data-evidence={finding.id}
      className={cn(
        "scroll-mt-20 rounded-lg transition-shadow",
        focused && "ring-primary/60 ring-2",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="hover:bg-background/40 flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn("text-sm leading-snug", !open && "line-clamp-2")}>
            {focused
              ? highlightQuote(finding.claim, focus?.quote)
              : finding.claim}
          </span>
          <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
            {finding.handles.length > 0 && (
              <span>{finding.handles.map((h) => `@${h}`).join(" · ")}</span>
            )}
            {finding.handles.length > 0 && posts > 0 && (
              <span aria-hidden>·</span>
            )}
            {posts > 0 && (
              <span>
                {posts} {posts === 1 ? "post" : "posts"}
              </span>
            )}
          </span>
        </div>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-muted-foreground mt-0.5"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 px-3 pb-3">
              <p className="text-foreground/75 text-sm">
                <span className="text-muted-foreground">Why it matters: </span>
                {finding.relevance}
              </p>
              {posts === 0 ? (
                <p className="text-muted-foreground/80 text-xs">
                  {stepHasPosts
                    ? "No post the search read closely matches this finding; see them all below."
                    : "No verified post links were returned for this finding."}
                </p>
              ) : (
                <>
                  {finding.matched && (
                    <p className="text-muted-foreground/80 text-xs">
                      Matched to this finding by content
                    </p>
                  )}
                  {finding.source_urls.map((url) => (
                    <TweetEmbed
                      key={url}
                      url={url}
                    />
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function PostsRead({ posts }: { posts: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? posts : posts.slice(0, POSTS_PREVIEW);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground/80 text-xs tracking-wide uppercase">
        Posts read · {posts.length}
      </span>
      <div className="flex flex-col gap-2">
        {visible.map((url) => (
          <TweetEmbed
            key={url}
            url={url}
          />
        ))}
      </div>
      {posts.length > POSTS_PREVIEW && (
        <ShowAllButton
          showAll={showAll}
          total={posts.length}
          noun="posts"
          onClick={() => setShowAll((v) => !v)}
        />
      )}
    </div>
  );
}

function FindingsDetail({
  stage,
  focus,
}: {
  stage: Stage;
  focus: ResearchFocusTarget | null;
}) {
  const findings = stage.detail?.findings ?? [];
  const queries = stage.detail?.queries ?? [];
  const posts = stage.detail?.posts ?? [];
  const ids = findings.map((f) => f.id);
  const [showAll, setShowAll] = useFocusReveal(ids, FINDINGS_PREVIEW, focus);
  const [openId, setOpenId] = useState<string | null>(null);
  useOnNewFocus(focus, (target) => {
    if (ids.includes(target.id)) setOpenId(target.id);
  });

  const visible = showAll ? findings : findings.slice(0, FINDINGS_PREVIEW);
  return (
    <div className="flex flex-col gap-3">
      {findings.length > 0 ? (
        <ul className="divide-border border-border bg-background/30 flex flex-col divide-y rounded-xl border">
          {visible.map((finding) => (
            <FindingRow
              key={finding.id}
              stepHasPosts={posts.length > 0}
              finding={finding}
              open={openId === finding.id}
              onToggle={() =>
                setOpenId((id) => (id === finding.id ? null : finding.id))
              }
              focus={focus}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          No findings matched the question.
        </p>
      )}
      {findings.length > FINDINGS_PREVIEW && (
        <ShowAllButton
          showAll={showAll}
          total={findings.length}
          noun="findings"
          onClick={() => setShowAll((v) => !v)}
        />
      )}
      {queries.length > 0 && <QueryChips queries={queries} />}
      {posts.length > 0 && <PostsRead posts={posts} />}
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  return (
    <span
      className="flex shrink-0 items-center gap-1.5"
      title={`${label}: ${score.toFixed(2)}`}
    >
      <span className="bg-background/70 h-1.5 w-10 overflow-hidden rounded-full">
        <span
          className="bg-primary/80 block h-full rounded-full"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-muted-foreground font-mono text-xs">
        {score.toFixed(2)}
      </span>
    </span>
  );
}

const ORIGIN_LABEL: Record<NonNullable<DocHit["origin"]>, string> = {
  base: "your question",
  expanded: "refined queries",
  both: "both",
};

function DocCard({
  doc,
  hit,
  rank,
  showOrigin,
  scoreLabel,
  focus,
}: {
  doc: DocInfo;
  hit: DocHit;
  rank?: number;
  showOrigin?: boolean;
  scoreLabel: string;
  focus: ResearchFocusTarget | null;
}) {
  const focused = focus?.id === doc.id;
  const [open, setOpen] = useState(false);
  useOnNewFocus(focus, (target) => {
    if (target.id === doc.id) setOpen(true);
  });
  const long = doc.text.length > EXCERPT_CLAMP_CHARS;

  return (
    <li
      data-evidence={doc.id}
      className={cn(
        "border-border bg-background/30 scroll-mt-20 rounded-xl border p-3 transition-shadow",
        focused && "ring-primary/60 ring-2",
      )}
    >
      <div className="flex items-start gap-2">
        {rank !== undefined && (
          <span className="text-muted-foreground mt-0.5 w-4 shrink-0 font-mono text-xs">
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-medium">
            {doc.title}
            {doc.author && (
              <span className="text-muted-foreground font-normal">
                {" "}
                · {doc.author}
              </span>
            )}
          </p>
          {doc.section.length > 0 && (
            <p className="text-foreground/55 truncate text-xs">
              {doc.section.join(" › ")}
            </p>
          )}
        </div>
        {typeof hit.score === "number" && (
          <ScoreBar
            score={hit.score}
            label={scoreLabel}
          />
        )}
      </div>
      {showOrigin && hit.origin && (
        <p className="text-foreground/55 mt-1.5 text-xs">
          Found via {ORIGIN_LABEL[hit.origin]}
        </p>
      )}
      <p
        className={cn(
          "text-foreground/80 mt-2 text-sm leading-relaxed whitespace-pre-line",
          !open && long && "line-clamp-3",
        )}
      >
        {focused ? highlightQuote(doc.text, focus?.quote) : doc.text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-primary mt-1 text-xs hover:underline"
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </li>
  );
}

function DocList({
  hits,
  docs,
  preview,
  ranked,
  showOrigin,
  scoreLabel,
  focus,
}: {
  hits: DocHit[];
  docs: Record<string, DocInfo>;
  preview: number;
  ranked?: boolean;
  showOrigin?: boolean;
  scoreLabel: string;
  focus: ResearchFocusTarget | null;
}) {
  const resolved = hits.filter((h) => docs[h.id]);
  const ids = resolved.map((h) => h.id);
  const [showAll, setShowAll] = useFocusReveal(ids, preview, focus);
  const visible = showAll ? resolved : resolved.slice(0, preview);
  if (resolved.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No documents matched.</p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {visible.map((hit, idx) => (
          <DocCard
            key={hit.id}
            doc={docs[hit.id]}
            hit={hit}
            rank={ranked ? idx + 1 : undefined}
            showOrigin={showOrigin}
            scoreLabel={scoreLabel}
            focus={focus}
          />
        ))}
      </ul>
      {resolved.length > preview && (
        <ShowAllButton
          showAll={showAll}
          total={resolved.length}
          noun="documents"
          onClick={() => setShowAll((v) => !v)}
        />
      )}
    </div>
  );
}

function EnrichDetail({
  stage,
  docs,
  focus,
}: {
  stage: Stage;
  docs: Record<string, DocInfo>;
  focus: ResearchFocusTarget | null;
}) {
  const queries = stage.detail?.queries ?? [];
  const hits = stage.detail?.hits ?? [];
  const grouped = hits.some((h) => h.queries?.length);
  if (!grouped) {
    return (
      <div className="flex flex-col gap-3">
        {queries.length > 0 && <QueryChips queries={queries} />}
        <DocList
          hits={hits}
          docs={docs}
          preview={DOCS_PREVIEW}
          scoreLabel="Vector similarity"
          focus={focus}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {queries.map((query) => {
        const queryHits = hits.filter((h) => h.queries?.includes(query));
        return (
          <div
            key={query}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <span className="bg-background/60 rounded-full px-2.5 py-0.5 font-mono text-xs">
                {query}
              </span>
              <span className="text-muted-foreground text-xs">
                {queryHits.length} {queryHits.length === 1 ? "doc" : "docs"}
              </span>
            </div>
            {queryHits.length > 0 && (
              <DocList
                hits={queryHits}
                docs={docs}
                preview={2}
                scoreLabel="Vector similarity"
                focus={focus}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function GateDetail({ stage }: { stage: Stage }) {
  const sufficient = stage.detail?.sufficient;
  return (
    <div className="border-border bg-background/30 flex items-start gap-2 rounded-xl border p-3">
      <span
        className={cn(
          "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs",
          sufficient
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-amber-500/15 text-amber-400",
        )}
      >
        {sufficient ? "sufficient" : "gaps found"}
      </span>
      <p className="text-foreground/85 text-sm leading-relaxed">
        {stage.detail?.reason}
      </p>
    </div>
  );
}

export function StageDetailView({
  stage,
  docs,
  focus,
}: {
  stage: Stage;
  docs: Record<string, DocInfo>;
  focus: ResearchFocusTarget | null;
}) {
  switch (stage.id) {
    case "trusted_search":
    case "womens_health_search":
    case "unrestricted_search":
      return (
        <FindingsDetail
          stage={stage}
          focus={focus}
        />
      );
    case "rag_base":
      return (
        <DocList
          hits={stage.detail?.hits ?? []}
          docs={docs}
          preview={DOCS_PREVIEW}
          scoreLabel="Vector similarity"
          focus={focus}
        />
      );
    case "rag_enrich":
      return (
        <EnrichDetail
          stage={stage}
          docs={docs}
          focus={focus}
        />
      );
    case "rag_merge":
      return (
        <DocList
          hits={stage.detail?.hits ?? []}
          docs={docs}
          preview={MERGED_PREVIEW}
          ranked
          showOrigin
          scoreLabel="Rerank relevance"
          focus={focus}
        />
      );
    case "gate":
      return <GateDetail stage={stage} />;
    default:
      return null;
  }
}
