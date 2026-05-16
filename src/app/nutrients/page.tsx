import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { NutrientGrid } from "@/components/nutrients/nutrient-grid";
import { fetchNutrientList } from "@/lib/content";

export const metadata: Metadata = {
  title: "Nutrients | Root Cause",
  description: "Search Root Cause nutrient guides.",
};

export default async function NutrientsPage() {
  const nutrients = await fetchNutrientList();
  return (
    <AppShell mainClassName="overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-14 pb-8 sm:pt-8">
        <section className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Nutrients</h1>
          <p className="text-muted-foreground text-lg">
            Nutrient guides with comprehensive quality and purity research.
          </p>
        </section>

        <NutrientGrid nutrients={nutrients} />
      </div>
    </AppShell>
  );
}
