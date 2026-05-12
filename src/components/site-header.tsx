import { UserButton } from "@clerk/nextjs";
import { AppNav } from "@/components/app-nav";

export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-20 flex w-full shrink-0 items-center justify-between gap-3 border-b-2 border-gray-500 px-4 py-2">
      <AppNav />

      <div className="flex items-center gap-3">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "border-2 border-muted-foreground",
            },
          }}
        />
      </div>
    </header>
  );
}
