import { View, Text } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View className="bg-amber-500 px-4 py-2">
      <Text className="text-white text-xs text-center font-medium">
        You're offline — showing cached data
      </Text>
    </View>
  );
}
