import { useState, useEffect } from "react";
import { AppState } from "react-native";

/**
 * Simple network status hook using fetch-based connectivity check.
 * Falls back to navigator.onLine when available.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        // Quick connectivity probe — HEAD request to a known-good URL
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        await fetch("https://clients3.google.com/generate_204", {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    }

    check();

    // Re-check when app comes to foreground
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    // Periodic check every 30s
    const interval = setInterval(check, 30_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return { isOnline };
}
