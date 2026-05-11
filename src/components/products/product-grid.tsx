"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ProductMeta } from "@/lib/content";

function matchesProduct(product: ProductMeta, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const searchable = [product.name, product.description, product.prompt].join(
    " ",
  );

  return searchable.toLowerCase().includes(normalizedQuery);
}

export function ProductGrid({ products }: { products: ProductMeta[] }) {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(
    () => products.filter((product) => matchesProduct(product, query)),
    [products, query],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-xl">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search supplements..."
          className="h-11 pl-9"
        />
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Link
              key={product.slug}
              href={`/products/${product.slug}`}
              className="group"
            >
              <Card className="border-border/50 bg-card/50 hover:border-primary/30 hover:bg-card h-full cursor-pointer py-5 shadow-none transition-colors">
                <CardHeader className="gap-2 px-5">
                  <CardTitle className="text-foreground/90 group-hover:text-foreground text-lg leading-snug">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="leading-6">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="px-5 pt-0">
                  <span className="text-primary flex items-center gap-1 text-sm font-medium">
                    View products <ArrowRight className="size-3.5" />
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed px-5 py-10 text-center text-sm">
          No supplements match your search.
        </div>
      )}
    </div>
  );
}
