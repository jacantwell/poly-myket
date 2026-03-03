import * as SecureStore from "expo-secure-store";
import type { TokenCache } from "@clerk/clerk-expo";

const createTokenCache = (): TokenCache => ({
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail — token caching is best-effort
    }
  },
  async clearToken(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silently fail
    }
  },
});

export const tokenCache = createTokenCache();
