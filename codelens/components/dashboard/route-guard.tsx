"use client";

import { usePathname } from "next/navigation";

// Forces a full unmount+remount of the page below whenever the URL changes,
// by keying on the pathname. This is a hard guarantee against a previous
// page's content ever staying on screen after navigating to a new one
// (in addition to disabling the Next.js router cache in next.config.mjs,
// which fixes the same class of bug at the framework level but only takes
// effect after a full dev-server restart).
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname}>{children}</div>;
}