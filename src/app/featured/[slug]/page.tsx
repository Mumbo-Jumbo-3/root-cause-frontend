import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchFeaturedQuery } from "@/lib/content";
import { FeaturedTabs } from "@/components/featured/tabs";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = await fetchFeaturedQuery(slug);
  if (!query) return { title: "Not Found" };

  return {
    title: `${query.query} | Root Cause Health`,
    description: query.description,
  };
}

export default async function FeaturedPage({ params }: PageProps) {
  const { slug } = await params;
  const query = await fetchFeaturedQuery(slug);
  if (!query) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </header>

      <FeaturedTabs
        responseMarkdown={query.response_markdown}
        shareLinks={query.shareLinks}
      />
    </div>
  );
}
