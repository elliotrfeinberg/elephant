import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_PROXIMITY_RADIUS_METERS } from "@/constants/config";

interface SettingsState {
  proximityRadius: number; // meters
  notificationsEnabled: boolean;
  setProximityRadius: (radius: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      proximityRadius: DEFAULT_PROXIMITY_RADIUS_METERS,
      notificationsEnabled: true,
      setProximityRadius: (proximityRadius) => set({ proximityRadius }),
      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
    }),
    {
      name: "elephant-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
