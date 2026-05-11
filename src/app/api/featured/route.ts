export const dynamic = "force-dynamic";

export async function GET() {
  const apiUrl = process.env.LANGGRAPH_API_URL;
  if (!apiUrl) {
    return Response.json(
      { error: "LANGGRAPH_API_URL not configured" },
      { status: 500 },
    );
  }

  const upstream = await fetch(`${apiUrl.replace(/\/$/, "")}/featured`, {
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
