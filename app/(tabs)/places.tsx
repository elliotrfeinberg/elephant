import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useUserPlaces } from "@/hooks/usePlaces";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { PlaceCard } from "@/components/places/PlaceCard";
import { distanceMeters } from "@/utils/geo";
import { formatDistance } from "@/utils/formatters";

export default function PlacesScreen() {
  const { data: places, isLoading, refetch } = useUserPlaces();
  const { location } = useCurrentLocation();
  const router = useRouter();

  function getDistance(placeLat: number, placeLng: number): string | undefined {
    if (!location) return undefined;
    const meters = distanceMeters(location, {
      latitude: placeLat,
      longitude: placeLng,
    });
    return formatDistance(meters);
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={places}
        keyExtractor={(item) => item.placeId}
        contentContainerStyle={{ padding: 16 }}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View className="items-center mt-16">
            <Text className="text-5xl mb-4">📍</Text>
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              No places yet
            </Text>
            <Text className="text-sm text-gray-500 text-center px-8">
              Search for a place in the Search tab and save it to start taking
              notes.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            onPress={() => router.push(`/place/${item.placeId}`)}
            distance={getDistance(
              item.location.latitude,
              item.location.longitude
            )}
          />
        )}
      />
    </View>
  );
}
