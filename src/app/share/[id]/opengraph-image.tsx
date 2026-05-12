import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Root Cause conversation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface ShareRow {
  title: string;
  first_message: string;
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

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "logo.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row, logoDataUrl] = await Promise.all([fetchShare(id), loadLogoDataUrl()]);
  const title = row?.title?.trim() || "Root Cause";
  const snippet = (row?.first_message ?? "").slice(0, 180);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
          color: "#fafafa",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 32,
            color: "#a3a3a3",
          }}
        >
          {logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoDataUrl}
              width={48}
              height={48}
              alt=""
              style={{ borderRadius: 10 }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "#10b981",
              }}
            />
          )}
          <span>Root Cause</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
          {snippet ? (
            <div style={{ fontSize: 28, color: "#a3a3a3", lineHeight: 1.4 }}>
              {snippet}
            </div>
          ) : null}
        </div>

        <div style={{ fontSize: 24, color: "#737373" }}>
          Shared conversation
        </div>
      </div>
    ),
    { ...size },
  );
}
