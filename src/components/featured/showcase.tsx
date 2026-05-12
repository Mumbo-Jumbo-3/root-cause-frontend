"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import type { FeaturedQueryMeta } from "@/lib/content";
import { FeaturedCard } from "./card";

const DRIFT_PX_PER_SEC = 30;
const BUTTON_COOLDOWN_MS = 2000;

export function FeaturedShowcase() {
  const arrowVariants: Variants = {
    idle: { scale: 1 },
    hover: {
      scale: 1.12,
      transition: { type: "spring", stiffness: 500, damping: 28 },
    },
    tap: {
      scale: 0.92,
      transition: { type: "spring", stiffness: 700, damping: 22 },
    },
  };
  const [items, setItems] = useState<FeaturedQueryMeta[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pauseCountRef = useRef(0);
  const buttonCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reducedMotionRef = useRef(false);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const onChange = () => {
      reducedMotionRef.current = mq.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || items.length === 0) return;

    let raf = 0;
    let last = performance.now();
    let startOffset = 0;
    let period = 0;
    let accum = scroller.scrollLeft;

    const measure = () => {
      const c0 = scroller.children[0] as HTMLElement | undefined;
      const cN = scroller.children[items.length] as HTMLElement | undefined;
      if (!c0 || !cN) return;
      const sRect = scroller.getBoundingClientRect();
      const c0Rect = c0.getBoundingClientRect();
      const cNRect = cN.getBoundingClientRect();
      startOffset = c0Rect.left - sRect.left + scroller.scrollLeft;
      period = cNRect.left - c0Rect.left;
    };
    measure();
    if (period > 0) {
      accum = startOffset;
      scroller.scrollLeft = startOffset;
    }

    const ro = new ResizeObserver(() => {
      measure();
      accum = scroller.scrollLeft;
    });
    ro.observe(scroller);
    Array.from(scroller.children).forEach((c) => ro.observe(c as Element));

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const paused =
        reducedMotionRef.current || pauseCountRef.current !== 0 || period <= 0;
      if (!paused) {
        accum += DRIFT_PX_PER_SEC * dt;
        if (accum >= startOffset + period) accum -= period;
        scroller.scrollLeft = accum;
      } else {
        accum = scroller.scrollLeft;
        if (period > 0 && accum >= startOffset + period) {
          accum -= period;
          scroller.scrollLeft = accum;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [items.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onIn = () => {
      pauseCountRef.current += 1;
    };
    const onOut = () => {
      pauseCountRef.current = Math.max(0, pauseCountRef.current - 1);
    };
    scroller.addEventListener("focusin", onIn);
    scroller.addEventListener("focusout", onOut);
    return () => {
      scroller.removeEventListener("focusin", onIn);
      scroller.removeEventListener("focusout", onOut);
    };
  }, [items.length]);

  if (items.length === 0) return null;

  function bumpButtonCooldown() {
    if (buttonCooldownTimerRef.current) {
      clearTimeout(buttonCooldownTimerRef.current);
    } else {
      pauseCountRef.current += 1;
    }
    buttonCooldownTimerRef.current = setTimeout(() => {
      pauseCountRef.current = Math.max(0, pauseCountRef.current - 1);
      buttonCooldownTimerRef.current = null;
    }, BUTTON_COOLDOWN_MS);
  }

  function stepBy(delta: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const first = scroller.children[0] as HTMLElement | undefined;
    const second = scroller.children[1] as HTMLElement | undefined;
    if (!first) return;
    const step = second
      ? second.offsetLeft - first.offsetLeft
      : first.offsetWidth;
    scroller.scrollBy({ left: step * delta, behavior: "smooth" });
    bumpButtonCooldown();
  }

  const onPointerEnter = () => {
    pauseCountRef.current += 1;
  };
  const onPointerLeave = () => {
    pauseCountRef.current = Math.max(0, pauseCountRef.current - 1);
  };

  const track = [...items, ...items, ...items];

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-1">
      <p className="text-xl text-white">Featured</p>
      <div
        className="relative w-full"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <div
          ref={scrollerRef}
          className="flex w-full min-w-0 gap-3 overflow-x-auto [mask-image:linear-gradient(to_right,transparent_0%,black_18%,black_82%,transparent_100%)] py-1 [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_18%,black_82%,transparent_100%)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {track.map((meta, i) => (
            <div
              key={`${meta.slug}-${i}`}
              className="shrink-0 basis-[80%] sm:basis-[42%] lg:basis-[30%]"
            >
              <FeaturedCard meta={meta} />
            </div>
          ))}
        </div>

        <div
          aria-hidden
          className="pointer-events-auto absolute inset-y-0 left-0 z-[5] w-[18%]"
        />
        <div
          aria-hidden
          className="pointer-events-auto absolute inset-y-0 right-0 z-[5] w-[18%]"
        />

        <motion.button
          onClick={() => stepBy(-1)}
          variants={arrowVariants}
          initial="idle"
          animate="idle"
          whileHover="hover"
          whileTap="tap"
          className="text-muted-foreground border-muted-foreground hover:border-primary hover:text-primary focus-visible:ring-primary absolute inset-y-0 left-1 z-10 flex w-14 items-center justify-center rounded-3xl border-2 bg-background transition-[box-shadow,border-color,color] duration-200 hover:shadow-[0_0_18px_2px_rgb(94_227_140_/_0.35)] focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Previous"
        >
          <ChevronLeft className="size-7" strokeWidth={2.5} />
        </motion.button>

        <motion.button
          onClick={() => stepBy(1)}
          variants={arrowVariants}
          initial="idle"
          animate="idle"
          whileHover="hover"
          whileTap="tap"
          className="text-muted-foreground border-muted-foreground hover:border-primary hover:text-primary focus-visible:ring-primary absolute inset-y-0 right-1 z-10 flex w-14 items-center justify-center rounded-3xl border-2 bg-background transition-[box-shadow,border-color,color] duration-200 hover:shadow-[0_0_18px_2px_rgb(94_227_140_/_0.35)] focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Next"
        >
          <ChevronRight className="size-7" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
