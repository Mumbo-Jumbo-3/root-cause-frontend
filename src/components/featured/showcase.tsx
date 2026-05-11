"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FeaturedQueryMeta } from "@/lib/content";
import { FeaturedCard } from "./card";

export function FeaturedShowcase() {
  const [items, setItems] = useState<FeaturedQueryMeta[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const visible = 3;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/featured", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FeaturedQueryMeta[]) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const maxStart = Math.max(0, items.length - visible);

  if (items.length === 0) return null;

  const canPrev = startIndex > 0;
  const canNext = startIndex < maxStart;

  function prev() {
    if (!canPrev) return;
    setDirection(-1);
    setStartIndex((i) => i - 1);
  }

  function next() {
    if (!canNext) return;
    setDirection(1);
    setStartIndex((i) => i + 1);
  }

  const visibleCards = items.slice(startIndex, startIndex + visible);

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-3">
      <p className="text-muted-foreground text-lg">Featured Queries</p>
      <div className="flex w-full items-center gap-2">
        <button
          onClick={prev}
          disabled={!canPrev}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-0"
          aria-label="Previous"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden py-1">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={startIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {visibleCards.map((meta) => (
                <FeaturedCard key={meta.slug} meta={meta} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          onClick={next}
          disabled={!canNext}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-0"
          aria-label="Next"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
