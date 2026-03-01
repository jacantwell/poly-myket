"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") ?? undefined;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SignIn forceRedirectUrl={redirectUrl} />
    </div>
  );
}
