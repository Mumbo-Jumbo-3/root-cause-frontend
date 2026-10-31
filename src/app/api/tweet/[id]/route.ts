import { NextResponse } from "next/server";
import { getTweet, type Tweet } from "react-tweet/api";

export const runtime = "nodejs";

const ENTITY_LISTS = ["hashtags", "user_mentions", "urls", "symbols"] as const;

/**
 * X's syndication API now omits empty entity lists, which react-tweet expects
 * to always be arrays (it iterates them unguarded and crashes the page).
 */
function withEntityLists<T extends Pick<Tweet, "entities">>(tweet: T): T {
  const entities = { ...tweet.entities } as Record<string, unknown>;
  for (const key of ENTITY_LISTS) {
    if (!Array.isArray(entities[key])) entities[key] = [];
  }
  return { ...tweet, entities: entities as unknown as T["entities"] };
}

// Tweets cited in research traces, fetched from X's public syndication API so
// the browser never talks to a third-party tweet proxy.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,25}$/.test(id)) {
    return NextResponse.json({ error: "invalid tweet id" }, { status: 400 });
  }

  try {
    const tweet = await getTweet(id);
    if (!tweet) {
      return NextResponse.json({ data: null }, { status: 404 });
    }
    const data = withEntityLists(tweet);
    if (data.quoted_tweet)
      data.quoted_tweet = withEntityLists(data.quoted_tweet);
    return NextResponse.json(
      { data },
      {
        headers: {
          "cache-control":
            "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "tweet unavailable" }, { status: 502 });
  }
}
