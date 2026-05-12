import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { IngestibleGrid } from "@/components/ingestibles/ingestible-grid";
import { fetchIngestibleList } from "@/lib/content";

export const metadata: Metadata = {
  title: "Ingestibles | Root Cause",
  description: "Search Root Cause ingestible guides.",
};

export default async function IngestiblesPage() {
  const ingestibles = await fetchIngestibleList();
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
        <section className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Ingestibles</h1>
          <p className="text-muted-foreground text-lg">
            Ingestible guides with comprehensive quality and purity research.
          </p>
        </section>

        <IngestibleGrid ingestibles={ingestibles} />
      </main>
    </div>
  );
}
