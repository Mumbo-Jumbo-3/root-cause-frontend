export interface FeaturedQueryMeta {
  slug: string;
  query: string;
  description: string;
  shareLinks: {
    chatgpt?: string;
    claude?: string;
    grok?: string;
  };
}

export interface FeaturedQuery extends FeaturedQueryMeta {
  response_markdown: string;
}

export interface ProductMeta {
  slug: string;
  name: string;
  description: string;
  prompt: string;
}

export interface Product extends ProductMeta {
  response_markdown: string;
}

function baseUrl(): string {
  const url = process.env.LANGGRAPH_API_URL;
  if (!url) throw new Error("LANGGRAPH_API_URL not configured");
  return url.replace(/\/$/, "");
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${baseUrl()}${path}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`backend ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchFeaturedList(): Promise<FeaturedQueryMeta[]> {
  return (await fetchJson<FeaturedQueryMeta[]>("/featured")) ?? [];
}

export async function fetchFeaturedQuery(
  slug: string,
): Promise<FeaturedQuery | null> {
  return fetchJson<FeaturedQuery>(`/featured/${encodeURIComponent(slug)}`);
}

export async function fetchProductList(): Promise<ProductMeta[]> {
  return (await fetchJson<ProductMeta[]>("/products")) ?? [];
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  return fetchJson<Product>(`/products/${encodeURIComponent(slug)}`);
}
