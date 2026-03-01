"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ROUTES } from "@/lib/constants";

export function AppHeader() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href={ROUTES.groups} className="text-lg font-bold">
          Poly-Myket
        </Link>
        <UserButton />
      </div>
    </header>
  );
}
