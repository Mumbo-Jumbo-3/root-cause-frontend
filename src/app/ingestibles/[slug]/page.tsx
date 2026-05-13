import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MarkdownText } from "@/components/thread/markdown-text";
import { fetchIngestible } from "@/lib/content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ingestible = await fetchIngestible(slug);
  if (!ingestible) return { title: "Not Found | Root Cause" };

  return {
    title: `${ingestible.name} Ingestibles | Root Cause`,
  };
}

export default async function IngestiblePage({ params }: PageProps) {
  const { slug } = await params;
  const ingestible = await fetchIngestible(slug);
  if (!ingestible) notFound();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
        <Link
          href="/ingestibles"
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Ingestibles
        </Link>

        <section className="border-border flex flex-col gap-4 border-b pb-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {ingestible.name}
          </h1>

          <div className="border-border bg-muted/40 rounded-lg border px-4 py-3">
            <p className="text-foreground text-sm font-medium">Prompt</p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {ingestible.prompt}
            </p>
          </div>
        </section>

        <article className="prose-sm">
          <MarkdownText>{ingestible.response_markdown}</MarkdownText>
        </article>
      </main>
    </div>
  );
}
