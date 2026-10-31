"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { StageTimelineState } from "@/hooks/use-stage-timeline";
import type { ResearchFocusTarget } from "./messages/research-detail";

/** A citation's request to reveal an evidence item in one turn's trace. */
export interface FocusRequest {
  turn: number;
  target: ResearchFocusTarget;
}

interface ResearchFocusValue {
  request: FocusRequest | null;
  jumpTo: (turn: number, evidenceId: string, quote?: string) => void;
}

const ResearchFocusContext = createContext<ResearchFocusValue>({
  request: null,
  jumpTo: () => {},
});

export function ResearchFocusProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<FocusRequest | null>(null);
  const nonce = useRef(0);
  const jumpTo = useCallback((turn: number, id: string, quote?: string) => {
    nonce.current += 1;
    setRequest({ turn, target: { id, quote, nonce: nonce.current } });
  }, []);
  return (
    <ResearchFocusContext.Provider value={{ request, jumpTo }}>
      {children}
    </ResearchFocusContext.Provider>
  );
}

export const useResearchFocus = () => useContext(ResearchFocusContext);

export interface ResolvedCitation {
  offset: number;
  evidenceId: string;
  quote?: string;
}

/** What an answer's citation chips need: its turn's trace and numbering. */
export interface TurnResearch {
  turn: number;
  timeline: StageTimelineState | null;
  citations: ResolvedCitation[];
  /** Evidence ids in citation-number order (number = index + 1). */
  order: string[];
}

export const TurnResearchContext = createContext<TurnResearch | null>(null);
