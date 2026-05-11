import fs from "fs";
import path from "path";
import { products } from "@/content/products";

export interface ProductMeta {
  slug: string;
  name: string;
  description: string;
  prompt: string;
}

export interface Product extends ProductMeta {
  responseMarkdown: string;
}

const CONTENT_DIR = path.join(process.cwd(), "src/content/products");

export function getAllProductSlugs(): string[] {
  return products.map((product) => product.slug);
}

export function getProduct(slug: string): Product | null {
  const meta = products.find((product) => product.slug === slug);
  if (!meta) return null;

  const responsePath = path.join(CONTENT_DIR, slug, "response.md");
  if (!fs.existsSync(responsePath)) return null;

  const responseMarkdown = fs.readFileSync(responsePath, "utf-8");

  return { ...meta, responseMarkdown };
}
