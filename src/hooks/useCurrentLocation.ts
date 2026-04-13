import { useState, useEffect } from "react";
import * as Location from "expo-location";
import type { LatLng } from "@/utils/geo";

interface UseCurrentLocationResult {
  location: LatLng | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useCurrentLocation(): UseCurrentLocationResult {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchLocation() {
    setIsLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        setIsLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (e: any) {
      setError(e.message ?? "Failed to get location");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLocation();
  }, []);

  return { location, error, isLoading, refresh: fetchLocation };
}
