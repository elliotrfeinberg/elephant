import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { observeAuthState } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import "../global.css";

const queryClient = new QueryClient();

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

  if (isLoading) {
    return null; // Could add a splash/loading screen here
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
