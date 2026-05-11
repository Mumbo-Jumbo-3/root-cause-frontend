import type { Metadata } from "next";
import "./globals.css";
import { DM_Sans } from "next/font/google";
import React from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import { clerkLocalization } from "@/lib/clerk-localization";

const dmSans = DM_Sans({
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "Root Cause Health",
  description: "AI health agent by Root Cause Health",
  openGraph: {
    siteName: "Root Cause Health",
    type: "website",
    title: "Root Cause Health",
    description: "AI health agent by Root Cause Health",
    images: [{ url: "/logo.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Root Cause Health",
    description: "AI health agent by Root Cause Health",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={dmSans.className}>
        <ClerkProvider
          appearance={{ theme: dark }}
          localization={clerkLocalization}
          signInUrl="/login"
          signUpUrl="/register"
          signInFallbackRedirectUrl="/chat"
          signUpFallbackRedirectUrl="/chat"
        >
          <ThemeProvider attribute="class" defaultTheme="dark">
            <NuqsAdapter>{children}</NuqsAdapter>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
