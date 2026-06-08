import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const REQUEST_HEADER_BLOCKLIST = new Set([...HOP_BY_HOP, "accept-encoding"]);
const RESPONSE_HEADER_BLOCKLIST = new Set([...HOP_BY_HOP, "content-encoding"]);

export interface ProxyContext {
  userId: string;
  apiUrl: string;
  authToken: string | null;
}

export async function withAuthedProxy(
  handler: (req: NextRequest, ctx: ProxyContext) => Promise<Response>,
  req: NextRequest,
): Promise<Response> {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl = process.env.LANGGRAPH_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { error: "LANGGRAPH_API_URL not configured" },
      { status: 500 },
    );
  }

  const authToken = await getToken();
  return handler(req, { userId, apiUrl, authToken });
}

export function forwardHeaders(req: NextRequest, ctx: ProxyContext): Headers {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!REQUEST_HEADER_BLOCKLIST.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  if (ctx.authToken) {
    headers.set("authorization", `Bearer ${ctx.authToken}`);
  }
  return headers;
}

export async function proxyUpstream(
  upstreamUrl: URL,
  method: string,
  headers: Headers,
  body: BodyInit | null,
): Promise<Response> {
  const upstream = await fetch(upstreamUrl, {
    method,
    headers,
    body,
    // @ts-expect-error duplex required for streaming request bodies in Node fetch
    duplex: body && typeof body !== "string" ? "half" : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!RESPONSE_HEADER_BLOCKLIST.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
