import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Sources | Root Cause",
  description: "Trusted sources used by Root Cause.",
};

const sources = [
  { label: "Ray Peat", href: "https://expulsia.com/health/peat-index" },
  { label: "@helios_movement", href: "https://x.com/helios_movement" },
  { label: "@grimhood", href: "https://x.com/grimhood" },
  { label: "@aestheticprimal", href: "https://x.com/aestheticprimal" },
  { label: "@hubermanlab", href: "https://x.com/hubermanlab" },
  { label: "@foundmyfitness", href: "https://x.com/foundmyfitness" },
  { label: "@outdoctrination", href: "https://x.com/outdoctrination" },
];

export default function SourcesPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
        <section className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Sources</h1>
          <p className="text-muted-foreground text-lg">
            Trusted sources informing Root Cause.
          </p>
        </section>

        <ul className="flex max-w-3xl flex-col gap-2">
          {sources.map(({ label, href }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white underline"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
