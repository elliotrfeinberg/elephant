import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { observeAuthState } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import {
  configureNotifications,
  setupNotificationResponseListener,
} from "@/services/notifications";
import "../global.css";

// Register background tasks at module scope (Expo requirement)
import "@/tasks/geofenceTask";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours — keep cached data for offline
      staleTime: 1000 * 60, // 1 minute before refetch
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "elephant-query-cache",
});

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <AuthGate>
        <StatusBar style="auto" />
        <Slot />
      </AuthGate>
    </PersistQueryClientProvider>
  );
}
