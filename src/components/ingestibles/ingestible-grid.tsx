"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { IngestibleMeta } from "@/lib/content";

function matchesIngestible(ingestible: IngestibleMeta, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const searchable = [ingestible.name, ingestible.prompt].join(" ");

  return searchable.toLowerCase().includes(normalizedQuery);
}

export function IngestibleGrid({
  ingestibles,
}: {
  ingestibles: IngestibleMeta[];
}) {
  const [query, setQuery] = useState("");

  const filteredIngestibles = useMemo(
    () =>
      ingestibles.filter((ingestible) => matchesIngestible(ingestible, query)),
    [ingestibles, query],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-xl">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search ingestibles..."
          className="h-11 border-2 border-gray-500 pl-9 placeholder:text-gray-300"
        />
      </div>

      {filteredIngestibles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredIngestibles.map((ingestible) => (
            <Link
              key={ingestible.slug}
              href={`/ingestibles/${ingestible.slug}`}
              className="group"
            >
              <Card className="border-2 border-gray-500 bg-card/50 hover:border-primary hover:bg-card h-full cursor-pointer py-5 shadow-none transition-colors">
                <CardHeader className="gap-2 px-5">
                  <CardTitle className="text-foreground/90 group-hover:text-foreground text-lg leading-snug">
                    {ingestible.name}
                  </CardTitle>
                </CardHeader>
                <CardFooter className="px-5 pt-0">
                  <span className="text-primary flex items-center gap-1 text-sm font-medium">
                    View <ArrowRight className="size-3.5" />
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed px-5 py-10 text-center text-sm">
          No ingestibles match your search.
        </div>
      )}
    </div>
  );
}
