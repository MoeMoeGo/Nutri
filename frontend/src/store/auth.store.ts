import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User, AuthTokens } from "@/types";
import { STORAGE_KEYS } from "@/constants";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;

  
  setAuth: (user: User, tokens: AuthTokens) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  setOnboardingComplete: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedOnboarding: false,

  setAuth: async (user, tokens) => {
    try {
      
      await SecureStore.setItemAsync(STORAGE_KEYS.accessToken, tokens.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, tokens.refreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(user));
      await SecureStore.setItemAsync(STORAGE_KEYS.userId, user.id);
      
      set({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isAuthenticated: true,
        hasCompletedOnboarding: user.onboardingCompleted === true, 
      });
    } catch (error) {
      console.error("Failed to store auth:", error);
    }
  },

  setUser: async (user) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(user));
      set({ 
        user, 
        hasCompletedOnboarding: user.onboardingCompleted === true, 
      });
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.accessToken);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.user);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.userId);
    } catch (error) {
      console.error("Failed to clear storage:", error);
    } finally {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        hasCompletedOnboarding: false,
      });
    }
  },

loadStoredAuth: async () => {
  console.log("🔄 loadStoredAuth started");
  set({ isLoading: true }); 

  try {
    const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.accessToken);
    const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.refreshToken);


    if (!accessToken || !refreshToken) {
      console.log("ℹ️ No tokens found in SecureStore");
      set({ isLoading: false, isAuthenticated: false });
      return;
    }


    console.log("🔑 Tokens found, fetching profile...");

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const freshUser = await response.json();
        
        set({
          accessToken,
          refreshToken,
          user: freshUser,
          isAuthenticated: true,
          hasCompletedOnboarding: freshUser.onboardingCompleted === true,
          isLoading: false, 
        });
        console.log("✅ Profile loaded:", { onboardingCompleted: freshUser.onboardingCompleted });
      } else {
        console.warn("⚠️ Token was present but server rejected it (401/500)");
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      console.error("❌ Failed to fetch profile during load:", error);
      set({ isLoading: false, isAuthenticated: false });
    }
  } catch (error) {
    console.error("❌ Failed to load stored auth:", error);
    set({ isLoading: false, isAuthenticated: false });
  }
},
  setOnboardingComplete: async () => {
    set({ hasCompletedOnboarding: true });
    
    const user = get().user;
    if (user) {
      const updatedUser = { ...user, onboardingCompleted: true };
      await SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  },

  refreshProfile: async () => {
    const { accessToken } = get();
    if (!accessToken) return;
    
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.ok) {
        const freshUser = await response.json();
        await get().setUser(freshUser);
      }
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  },
}));