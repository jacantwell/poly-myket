import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { setApiUrl, setTokenGetter, api } from "poly-myket-shared";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:6767";

export function useApiSetup() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();

  useEffect(() => {
    setApiUrl(API_URL);
  }, []);

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
}
