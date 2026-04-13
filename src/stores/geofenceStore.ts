import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface GeofenceEntry {
  placeId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  radius: number;
}

interface GeofenceState {
  /** Places currently registered as OS geofences */
  activeGeofences: GeofenceEntry[];
  /** Whether the user has enabled auto-surfacing */
  autoSurfacingEnabled: boolean;
  setActiveGeofences: (geofences: GeofenceEntry[]) => void;
  setAutoSurfacingEnabled: (enabled: boolean) => void;
}

export const useGeofenceStore = create<GeofenceState>()(
  persist(
    (set) => ({
      activeGeofences: [],
      autoSurfacingEnabled: false,
      setActiveGeofences: (activeGeofences) => set({ activeGeofences }),
      setAutoSurfacingEnabled: (autoSurfacingEnabled) =>
        set({ autoSurfacingEnabled }),
    }),
    {
      name: "elephant-geofences",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
