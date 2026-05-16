"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  BookOpen,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Pill,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useThreads } from "@/providers/Thread";
import { RootCauseLogo } from "@/components/icons/root-cause";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navLinks: NavLink[] = [
  { href: "/chat/history", label: "History", icon: History },
  { href: "/nutrients", label: "Nutrients", icon: Pill },
  { href: "/sources", label: "Sources", icon: BookOpen },
];

const RECENTS_LIMIT = 8;

export function AppSidebar({
  collapsed,
  onToggle,
  showToggle = true,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  showToggle?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { threads, refreshThreads } = useThreads();

  useEffect(() => {
    refreshThreads({ silent: true }).catch(() => {
      // surfaced elsewhere; sidebar stays usable
    });
  }, [refreshThreads]);

  const handleNewChat = () => {
    router.push("/chat");
    onNavigate?.();
  };

  const recents = threads.slice(0, RECENTS_LIMIT);

  return (
    <aside
      className={cn(
        "bg-background text-sidebar-foreground flex h-full shrink-0 flex-col overflow-hidden border-r-2 border-gray-500 transition-[width] duration-200 ease-out",
        collapsed ? "w-14" : "w-64",
      )}
      aria-label="Primary navigation"
    >
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-3",
          collapsed ? "justify-center" : "justify-between px-3",
        )}
      >
        {!collapsed && (
          <Link
            href="/chat"
            onClick={onNavigate}
            className="flex min-w-0 items-center gap-2 px-1"
          >
            <RootCauseLogo
              className="size-6 shrink-0"
              width={24}
              height={24}
            />
            <span className="truncate text-base font-semibold tracking-tight whitespace-nowrap">
              Root Cause
            </span>
          </Link>
        )}
        {showToggle && onToggle && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground size-9"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </Button>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 px-2" aria-label="Primary">
        <button
          type="button"
          onClick={handleNewChat}
          aria-label="New chat"
          className={cn(
            "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors",
            collapsed && "justify-center px-0",
          )}
        >
          <Plus className="size-5 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">New chat</span>}
        </button>

        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active && "bg-sidebar-accent text-sidebar-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col px-2">
          <div className="text-sidebar-foreground/60 px-3 pb-1 text-xs font-medium tracking-wide uppercase">
            Recents
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
            {recents.length === 0 ? (
              <p className="text-sidebar-foreground/50 px-3 py-2 text-sm">
                No conversations yet
              </p>
            ) : (
              recents.map((t) => {
                const title = t.metadata?.title?.trim();
                const itemText =
                  title && title.length > 0 ? title : "New conversation";
                return (
                  <Link
                    key={t.thread_id}
                    href={`/chat?threadId=${t.thread_id}`}
                    onClick={onNavigate}
                    className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground flex items-center rounded-md px-3 py-2 text-sm transition-colors"
                    title={itemText}
                  >
                    <span className="truncate">{itemText}</span>
                  </Link>
                );
              })
            )}
          </div>
          {threads.length > RECENTS_LIMIT && (
            <Link
              href="/chat/history"
              onClick={onNavigate}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground px-3 pt-1 pb-2 text-xs"
            >
              See all →
            </Link>
          )}
        </div>
      )}

      {collapsed && <div className="flex-1" />}

      <div
        className={cn(
          "mt-2 border-t-2 border-gray-500 px-2 py-3",
          collapsed && "flex justify-center px-0",
        )}
      >
        <UserButton
          showName={!collapsed}
          appearance={{
            elements: {
              avatarBox: "border-2 border-gray-500 size-8",
              userButtonOuterIdentifier: "text-sidebar-foreground text-sm",
              userButtonTrigger: "rounded-md px-2 py-1.5 hover:bg-sidebar-accent",
            },
          }}
        />
      </div>
    </aside>
  );
}
