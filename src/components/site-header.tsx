import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { AppNav } from "@/components/app-nav";
import { RootCauseHealthLogo } from "@/components/icons/root-cause-health";

export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-20 grid w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2">
      <Link
        href="/chat"
        className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-2 justify-self-start text-sm transition-colors"
      >
        <RootCauseHealthLogo
          width={24}
          height={24}
        />
        <span className="truncate font-semibold">Root Cause Health</span>
      </Link>

      <AppNav className="justify-self-center" />

      <div className="flex items-center justify-self-end gap-3">
        <UserButton />
      </div>
    </header>
  );
}
