import { useAuthStore } from "@/store/auth.store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import "../index.css";
import { registerBackgroundSync } from "@/tasks/background-sync"; 
import { SQLiteProvider } from "expo-sqlite";
import { initLocalDb } from "@/db/local";
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2 * 60 * 1000,
    },
  },
});

function AuthGate() {
  const { isAuthenticated, isLoading, hasCompletedOnboarding, loadStoredAuth } =
    useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const hasLoaded = useRef(false);
  const hasRouted = useRef(false);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadStoredAuth();
    }
  }, [loadStoredAuth]);

  useEffect(() => {
    if (isLoading) return;
    if (hasRouted.current) return;
    
    SplashScreen.hideAsync();

    if (segments[0] === undefined) {
      hasRouted.current = true;
      if (!isAuthenticated) {
        router.replace("/(auth)/login");
      } else if (!hasCompletedOnboarding) {
        router.replace("/(auth)/onboarding");
      } else {
        router.replace("/(tabs)");
      }
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      hasRouted.current = true;
      router.replace("/(auth)/login");
    } 
    else if (isAuthenticated && !hasCompletedOnboarding) {
      const isOnOnboardingScreen = segments[1] === "onboarding";
      if (!isOnOnboardingScreen) {
        hasRouted.current = true;
        router.replace("/(auth)/onboarding");
      }
    } 
    else if (isAuthenticated && hasCompletedOnboarding && inAuthGroup) {
      hasRouted.current = true;
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, hasCompletedOnboarding, segments, router]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    registerBackgroundSync().catch(console.error);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <SQLiteProvider databaseName="calorieapp.db" onInit={initLocalDb}>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="modal/add-food"
          options={{ presentation: "modal", headerShown: true, title: "Add food" }}
        />
        <Stack.Screen
          name="modal/barcode"
          options={{ presentation: "fullScreenModal", headerShown: false }}
        />
      </Stack>
      </SQLiteProvider>
    </QueryClientProvider>
  );
}