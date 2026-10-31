import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/share/(.*)",
  "/featured/(.*)",
  "/nutrients(.*)",
  "/api/featured(.*)",
  "/api/tweet(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};
