import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";

export default function PlaceDetailScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();

  return (
    <>
      <Stack.Screen options={{ title: "Place Details" }} />
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-6xl mb-4">📝</Text>
        <Text className="text-xl font-semibold text-gray-900">
          Place Details
        </Text>
        <Text className="text-sm text-gray-500 mt-2">ID: {placeId}</Text>
      </View>
    </>
  );
}
