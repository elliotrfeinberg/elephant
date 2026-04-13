import { useCallback } from "react";
import { Alert } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { useGeofenceStore } from "@/stores/geofenceStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCurrentLocation } from "./useCurrentLocation";
import {
  requestBackgroundLocation,
  hasBackgroundLocationPermission,
} from "@/utils/permissions";
import { requestNotificationPermission } from "@/services/notifications";
import { startGeofencing, stopGeofencing } from "@/services/geofencing";

export function useGeofencing() {
  const userId = useAuthStore((s) => s.user?.uid);
  const { location } = useCurrentLocation();
  const {
    autoSurfacingEnabled,
    activeGeofences,
    setAutoSurfacingEnabled,
  } = useGeofenceStore();
  const proximityRadius = useSettingsStore((s) => s.proximityRadius);

  const enableAutoSurfacing = useCallback(async () => {
    if (!userId || !location) {
      Alert.alert(
        "Not Available",
        "Please ensure you're signed in and location is enabled."
      );
      return false;
    }

    // Request background location permission
    const locationGranted = await requestBackgroundLocation();
    if (!locationGranted) return false;

    // Request notification permission
    const notifGranted = await requestNotificationPermission();
    if (!notifGranted) {
      Alert.alert(
        "Notifications Needed",
        "Elephant needs notification permission to remind you about nearby places."
      );
      return false;
    }

    try {
      await startGeofencing(userId, location, proximityRadius);
      setAutoSurfacingEnabled(true);
      return true;
    } catch (e: any) {
      console.error("Failed to start geofencing:", e);
      Alert.alert("Error", "Failed to enable nearby reminders.");
      return false;
    }
  }, [userId, location, proximityRadius, setAutoSurfacingEnabled]);

  const disableAutoSurfacing = useCallback(async () => {
    try {
      await stopGeofencing();
      setAutoSurfacingEnabled(false);
    } catch (e: any) {
      console.error("Failed to stop geofencing:", e);
    }
  }, [setAutoSurfacingEnabled]);

  const refreshGeofences = useCallback(async () => {
    if (!autoSurfacingEnabled || !userId || !location) return;

    try {
      await startGeofencing(userId, location, proximityRadius);
    } catch (e: any) {
      console.error("Failed to refresh geofences:", e);
    }
  }, [autoSurfacingEnabled, userId, location, proximityRadius]);

  return {
    autoSurfacingEnabled,
    activeGeofenceCount: activeGeofences.length,
    enableAutoSurfacing,
    disableAutoSurfacing,
    refreshGeofences,
  };
}
