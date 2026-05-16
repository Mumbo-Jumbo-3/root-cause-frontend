import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchFeaturedQuery } from "@/lib/content";
import { FeaturedTabs } from "@/components/featured/tabs";
import { AppShell } from "@/components/app-shell";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = await fetchFeaturedQuery(slug);
  if (!query) return { title: "Not Found" };

  return {
    title: `${query.query} | Root Cause`,
    description: query.description,
  };
}

export default async function FeaturedPage({ params }: PageProps) {
  const { slug } = await params;
  const query = await fetchFeaturedQuery(slug);
  if (!query) notFound();

  return (
    <AppShell mainClassName="overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pb-3">
        <FeaturedTabs
          responseMarkdown={query.response_markdown}
          shareLinks={query.shareLinks}
        />
      </div>
    </AppShell>
  );
}
