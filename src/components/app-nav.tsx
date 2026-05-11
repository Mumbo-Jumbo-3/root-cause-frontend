"use client";

import Link from "next/link";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Chat", icon: MessageCircle },
  { href: "/products", label: "Products", icon: ShoppingBag },
];

export function AppNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn("flex items-center gap-1", className)}
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              "text-muted-foreground hover:bg-accent hover:text-foreground flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
              active && "bg-accent text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
