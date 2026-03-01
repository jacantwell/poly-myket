"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") ?? undefined;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SignUp forceRedirectUrl={redirectUrl} />
    </div>
  );
}
