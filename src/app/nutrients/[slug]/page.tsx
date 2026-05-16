import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MarkdownText } from "@/components/thread/markdown-text";
import { fetchNutrient } from "@/lib/content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const nutrient = await fetchNutrient(slug);
  if (!nutrient) return { title: "Not Found | Root Cause" };

  return {
    title: `${nutrient.name} Nutrients | Root Cause`,
  };
}

export default async function NutrientPage({ params }: PageProps) {
  const { slug } = await params;
  const nutrient = await fetchNutrient(slug);
  if (!nutrient) notFound();

  return (
    <AppShell mainClassName="overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <Link
          href="/nutrients"
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Nutrients
        </Link>

        <section className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            {nutrient.name}
          </h1>

          <div className="border-border bg-muted/40 rounded-lg border px-4 py-3">
            <p className="text-foreground text-base font-medium">Prompt</p>
            <p className="text-muted-foreground mt-1 text-base leading-7">
              {nutrient.prompt}
            </p>
          </div>
        </section>

        <article className="prose-sm">
          <MarkdownText>{nutrient.response_markdown}</MarkdownText>
        </article>
      </div>
    </AppShell>
  );
}
