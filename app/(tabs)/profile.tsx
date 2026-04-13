import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { signOut } from "@/services/auth";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
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
          Settings
        </Text>

        <View className="bg-gray-50 rounded-xl p-4 mb-3">
          <Text className="text-base text-gray-900">Proximity Radius</Text>
          <Text className="text-sm text-gray-500 mt-1">
            200 meters (configurable later)
          </Text>
        </View>

        <View className="bg-gray-50 rounded-xl p-4 mb-3">
          <Text className="text-base text-gray-900">Notifications</Text>
          <Text className="text-sm text-gray-500 mt-1">
            Get reminded when near saved places
          </Text>
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
