import { View, Text, TouchableOpacity, Switch, Alert } from "react-native";
import Slider from "@react-native-community/slider";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useGeofencing } from "@/hooks/useGeofencing";
import { signOut } from "@/services/auth";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const {
    proximityRadius,
    notificationsEnabled,
    setProximityRadius,
    setNotificationsEnabled,
  } = useSettingsStore();

  const {
    autoSurfacingEnabled,
    activeGeofenceCount,
    enableAutoSurfacing,
    disableAutoSurfacing,
    refreshGeofences,
  } = useGeofencing();

  async function handleToggleAutoSurfacing(value: boolean) {
    if (value) {
      await enableAutoSurfacing();
    } else {
      await disableAutoSurfacing();
    }
  }

  async function handleToggleNotifications(value: boolean) {
    setNotificationsEnabled(value);
    if (autoSurfacingEnabled) {
      await refreshGeofences();
    }
  }

  async function handleRadiusChange(value: number) {
    const rounded = Math.round(value / 50) * 50; // Round to nearest 50m
    setProximityRadius(rounded);
  }

  async function handleRadiusComplete() {
    if (autoSurfacingEnabled) {
      await refreshGeofences();
    }
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await disableAutoSurfacing();
            await signOut();
          } catch (error: any) {
            Alert.alert("Error", error.message ?? "Failed to sign out.");
          }
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      {/* User info */}
      <View className="items-center mb-8">
        <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-3">
          <Text className="text-3xl">🐘</Text>
        </View>
        <Text className="text-xl font-semibold text-gray-900">
          {user?.displayName ?? "User"}
        </Text>
        <Text className="text-sm text-gray-500">{user?.email}</Text>
      </View>

      <View className="border-t border-gray-100 pt-6">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Nearby Reminders
        </Text>

        {/* Auto-surfacing toggle */}
        <View className="bg-gray-50 rounded-xl p-4 mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-base text-gray-900">Auto-Surface Notes</Text>
              <Text className="text-xs text-gray-500 mt-1">
                Get notified when you're near a saved place
              </Text>
            </View>
            <Switch
              value={autoSurfacingEnabled}
              onValueChange={handleToggleAutoSurfacing}
              trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
              thumbColor={autoSurfacingEnabled ? "#2563eb" : "#f4f4f5"}
            />
          </View>
          {autoSurfacingEnabled && (
            <Text className="text-xs text-primary-600 mt-2">
              Monitoring {activeGeofenceCount} place
              {activeGeofenceCount !== 1 ? "s" : ""} nearby
            </Text>
          )}
        </View>

        {/* Notifications toggle */}
        <View className="bg-gray-50 rounded-xl p-4 mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-base text-gray-900">Notifications</Text>
              <Text className="text-xs text-gray-500 mt-1">
                Sound and banner when entering a place
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
              thumbColor={notificationsEnabled ? "#2563eb" : "#f4f4f5"}
            />
          </View>
        </View>

        {/* Proximity radius slider */}
        <View className="bg-gray-50 rounded-xl p-4 mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base text-gray-900">Proximity Radius</Text>
            <Text className="text-sm font-medium text-primary-600">
              {proximityRadius}m
            </Text>
          </View>
          <Text className="text-xs text-gray-500 mb-3">
            How close you need to be for a reminder
          </Text>
          <Slider
            minimumValue={50}
            maximumValue={1000}
            step={50}
            value={proximityRadius}
            onValueChange={handleRadiusChange}
            onSlidingComplete={handleRadiusComplete}
            minimumTrackTintColor="#2563eb"
            maximumTrackTintColor="#d1d5db"
            thumbTintColor="#2563eb"
          />
          <View className="flex-row justify-between mt-1">
            <Text className="text-xs text-gray-400">50m</Text>
            <Text className="text-xs text-gray-400">1km</Text>
          </View>
        </View>
      </View>

      <View className="flex-1" />

      <TouchableOpacity
        className="border border-red-300 rounded-xl py-4 items-center mb-10"
        onPress={handleSignOut}
      >
        <Text className="text-red-600 font-semibold text-base">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
