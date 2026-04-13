import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { observeAuthState } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import {
  configureNotifications,
  setupNotificationResponseListener,
} from "@/services/notifications";
import "../global.css";

// Register background tasks at module scope (Expo requirement)
import "@/tasks/geofenceTask";

const queryClient = new QueryClient();

// Configure how notifications appear when the app is foregrounded
configureNotifications();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, setUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = observeAuthState((firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, [setUser]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)/map");
    }
  }, [user, isLoading, segments, router]);

  // Set up notification tap handler for deep linking
  useEffect(() => {
    const cleanup = setupNotificationResponseListener();
    return cleanup;
  }, []);

  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <StatusBar style="auto" />
        <Slot />
      </AuthGate>
    </QueryClientProvider>
  );
}
