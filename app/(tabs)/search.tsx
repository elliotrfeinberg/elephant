import { View, Text } from "react-native";

export default function SearchScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-6xl mb-4">🔍</Text>
      <Text className="text-xl font-semibold text-gray-900">Search Places</Text>
      <Text className="text-sm text-gray-500 mt-2 text-center px-8">
        Search for restaurants, cafes, shops, and more to save notes about.
      </Text>
    </View>
  );
}
