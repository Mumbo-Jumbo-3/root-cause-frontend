"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import type { FeaturedQueryMeta } from "@/lib/content";

export function FeaturedCard({ meta }: { meta: FeaturedQueryMeta }) {
  return (
    <Link href={`/featured/${meta.slug}`}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Card className="group h-full cursor-pointer border-border/50 bg-card/50 py-4 shadow-none transition-colors hover:border-primary/30 hover:bg-card">
          <CardHeader className="gap-1.5 px-4">
            <CardTitle className="text-base font-medium leading-snug text-foreground/90 group-hover:text-foreground">
              {meta.query}
            </CardTitle>
            <CardDescription className="text-sm">
              {meta.description}
            </CardDescription>
          </CardHeader>
          <CardFooter className="px-4 pt-0">
            <span className="flex items-center gap-1 text-sm text-primary">
              Read response <ArrowRight className="size-3.5" />
            </span>
          </CardFooter>
        </Card>
      </motion.div>
    </Link>
  );
}
