"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api, ApiClientError } from "@/lib/api";
import { ROUTES } from "@/lib/constants";

type State =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "joining" }
  | { status: "success"; groupId: string; groupName: string }
  | { status: "error"; message: string };

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setState({ status: "unauthenticated" });
      router.replace(`${ROUTES.signUp}?redirect_url=${ROUTES.invite(code)}`);
      return;
    }

    if (joinedRef.current) return;
    joinedRef.current = true;

    setState({ status: "joining" });
    api
      .joinGroup({ invite_code: code })
      .then((group) => {
        setState({ status: "success", groupId: group.id, groupName: group.name });
        setTimeout(() => router.replace(ROUTES.group(group.id)), 1500);
      })
      .catch((err) => {
        joinedRef.current = false;
        if (err instanceof ApiClientError && err.status === 404) {
          setState({ status: "error", message: "Invalid invite code. This link may have expired or doesn't exist." });
        } else {
          setState({ status: "error", message: "Something went wrong. Please try again." });
        }
      });
  }, [isLoaded, isSignedIn, code, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        {(state.status === "loading" || state.status === "unauthenticated") && (
          <p className="text-muted-foreground">Loading...</p>
        )}

        {state.status === "joining" && (
          <p className="text-muted-foreground">Joining group...</p>
        )}

        {state.status === "success" && (
          <>
            <h1 className="text-2xl font-bold">You&apos;re in!</h1>
            <p className="text-muted-foreground">
              You&apos;ve joined <span className="font-medium text-foreground">{state.groupName}</span>. Redirecting...
            </p>
          </>
        )}

        {state.status === "error" && (
          <>
            <h1 className="text-2xl font-bold">Oops</h1>
            <p className="text-muted-foreground">{state.message}</p>
          </>
        )}
      </div>
    </div>
  );
}
