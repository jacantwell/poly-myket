"use client";

import { useUser } from "@clerk/nextjs";
import { AppHeader } from "@/components/layout/app-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b">
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <main className="container mx-auto flex-1 px-4 py-6">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  if (!isSignedIn) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="container mx-auto flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
