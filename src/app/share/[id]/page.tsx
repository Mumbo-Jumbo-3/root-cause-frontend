import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadOnlyMessages } from "@/components/thread/messages/read-only";
import { RootCauseLogo } from "@/components/icons/root-cause";
import type { Message } from "@/lib/agent-types";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ShareRow {
  share_id: string;
  thread_id: string;
  title: string;
  first_message: string;
  created_at: string;
}

async function fetchShare(id: string): Promise<ShareRow | null> {
  const apiUrl = process.env.LANGGRAPH_API_URL;
  if (!apiUrl) return null;

  try {
    const res = await fetch(new URL(`/share/${id}`, apiUrl), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ShareRow;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const row = await fetchShare(id);
  if (!row) return { title: "Not Found | Root Cause" };

  const title = row.title || "Health conversation";
  const description =
    row.first_message.slice(0, 200) || "A shared conversation from Root Cause.";
  const imagePath = `/share/${id}/opengraph-image`;

  return {
    title: `${title} | Root Cause`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/share/${id}`,
      siteName: "Root Cause",
      images: [{ url: imagePath, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imagePath],
    },
  };
}

async function fetchMessages(shareId: string): Promise<Message[] | null> {
  const apiUrl = process.env.LANGGRAPH_API_URL;
  if (!apiUrl) return null;

  try {
    const res = await fetch(new URL(`/share/${shareId}/state`, apiUrl), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const state = (await res.json()) as {
      values?: { messages?: Message[] };
    };
    return state.values?.messages ?? [];
  } catch {
    return null;
  }
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const row = await fetchShare(id);
  if (!row) notFound();

  const messages = await fetchMessages(id);
  if (!messages) notFound();

  return (
    <div className="min-h-screen">
      <Link
        href="/chat"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <RootCauseLogo width={24} height={24} />
        <span className="font-semibold">Root Cause</span>
      </Link>

      <ReadOnlyMessages messages={messages} />
    </div>
  );
}
