import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import authService, { LoginPayload, RegisterPayload, OnboardingPayload } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { QUERY_KEYS } from "@/constants";
import { apiClient } from "@/services/api.client";
import { User } from "@/types";

export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: async () => { const data = await authService.getProfile(); await setUser(data); return data; },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: async ({ user, tokens }) => { await setAuth(user, tokens); router.replace("/(auth)/onboarding"); },
  });
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: async ({ user, tokens }) => {
      await setAuth(user, tokens);
      router.replace(user.onboardingCompleted ? "/(tabs)" : "/(auth)/onboarding");
    },
  });
}

export function useGoogleLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  return useMutation({
    mutationFn: (idToken: string) => authService.loginWithGoogle(idToken),
    onSuccess: async ({ user, tokens }) => {
      await setAuth(user, tokens);
      router.replace(user.onboardingCompleted ? "/(tabs)" : "/(auth)/onboarding");
    },
  });
}

export function useAppleLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: Parameters<typeof authService.loginWithApple>[0]) => authService.loginWithApple(payload),
    onSuccess: async ({ user, tokens }) => {
      await setAuth(user, tokens);
      router.replace(user.onboardingCompleted ? "/(tabs)" : "/(auth)/onboarding");
    },
  });
}

export function useCompleteOnboarding() {
  const setUser = useAuthStore((s) => s.setUser);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (payload: OnboardingPayload) => {
      const { data } = await apiClient.put<User>("/user/profile", { ...payload, onboardingCompleted: true });
      return data;
    },
    onSuccess: async (user) => {
      await setUser(user);
      await setOnboardingComplete();
      queryClient.setQueryData(QUERY_KEYS.profile, user);
      router.replace("/(tabs)");
    },
  });
}

export function useUpdateNotificationPrefs() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: { notifyBreakfast?: boolean; notifyLunch?: boolean; notifyDinner?: boolean; notifySummary?: boolean }) =>
      apiClient.put<User>("/user/profile", prefs).then((r) => r.data),
    onSuccess: async (user) => { await setUser(user); queryClient.setQueryData(QUERY_KEYS.profile, user); },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const router = useRouter();
  return () => { logout(); queryClient.clear(); router.replace("/(auth)/login"); };
}
