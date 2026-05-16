"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSidebarState } from "@/hooks/use-sidebar-state";

export function AppShell({
  children,
  mainClassName,
}: {
  children: ReactNode;
  mainClassName?: string;
}) {
  const { collapsed, toggle } = useSidebarState();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <div className="hidden sm:flex">
        <AppSidebar collapsed={collapsed} onToggle={toggle} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="bg-background w-72 max-w-[80%] border-r-2 border-gray-500 p-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Primary navigation, recent conversations, and account.
          </SheetDescription>
          <AppSidebar
            collapsed={false}
            showToggle={false}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <main
        className={cn(
          "relative flex min-w-0 flex-1 flex-col overflow-hidden",
          mainClassName,
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="text-muted-foreground hover:text-foreground absolute top-2 left-2 z-30 size-9 sm:hidden"
        >
          <Menu className="size-5" />
        </Button>
        {children}
      </main>
    </div>
  );
}
