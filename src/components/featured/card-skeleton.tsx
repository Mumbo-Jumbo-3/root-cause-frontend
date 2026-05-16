import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedCardSkeleton() {
  return (
    <Card className="h-full min-h-40 border-2 border-gray-500 bg-card/50 py-4 shadow-none">
      <CardHeader className="gap-1.5 px-4">
        <Skeleton className="h-4 w-4/5" />
        <div className="flex flex-col gap-1.5 pt-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </CardHeader>
      <CardFooter className="px-4 pt-0">
        <Skeleton className="h-3 w-[30%]" />
      </CardFooter>
    </Card>
  );
}
