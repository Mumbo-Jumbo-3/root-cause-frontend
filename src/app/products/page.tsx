import type { Metadata } from "next";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { AppNav } from "@/components/app-nav";
import { RootCauseHealthLogo } from "@/components/icons/root-cause-health";
import { ProductGrid } from "@/components/products/product-grid";
import { fetchProductList } from "@/lib/content";

export const metadata: Metadata = {
  title: "Products | Root Cause Health",
  description: "Search Root Cause Health supplement product guides.",
};

export default async function ProductsPage() {
  const products = await fetchProductList();
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-2 text-sm transition-colors"
        >
          <RootCauseHealthLogo
            width={24}
            height={24}
          />
          <span className="truncate font-semibold">Root Cause Health</span>
        </Link>

        <div className="flex items-center gap-3">
          <AppNav />
          <UserButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
        <section className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-lg">
            Search supplement guides with pre-generated product quality and
            purity research.
          </p>
        </section>

        <ProductGrid products={products} />
      </main>
    </div>
  );
}
