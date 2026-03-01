"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { api, setTokenGetter } from "./api";

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();

  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  // Sync Clerk profile image to backend
  useEffect(() => {
    if (!clerkUser?.imageUrl) return;
    api.updateMe({ image_url: clerkUser.imageUrl }).catch(() => {
      // Silently ignore — image sync is best-effort
    });
  }, [clerkUser?.imageUrl]);

  return <>{children}</>;
}
