import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useUserPlaces } from "@/hooks/usePlaces";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { PlaceCard } from "@/components/places/PlaceCard";
import { distanceMeters } from "@/utils/geo";
import { formatDistance } from "@/utils/formatters";
import {
  PLACE_CATEGORIES,
  CATEGORY_CONFIG,
  type PlaceCategory,
} from "@/constants/categories";

export default function PlacesScreen() {
  const { data: places, isLoading, refetch } = useUserPlaces();
  const { location } = useCurrentLocation();
  const router = useRouter();

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<PlaceCategory | null>(null);

  const filteredPlaces = useMemo(() => {
    if (!places) return [];

    let result = places;

    // Filter by category
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Filter by search text (name, address, or tags)
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.address.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    return result;
  }, [places, selectedCategory, searchText]);

  function getDistance(placeLat: number, placeLng: number): string | undefined {
    if (!location) return undefined;
    const meters = distanceMeters(location, {
      latitude: placeLat,
      longitude: placeLng,
    });
    return formatDistance(meters);
  }

  if (isLoading && !places) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search bar */}
      <View className="bg-white px-4 pt-3 pb-2">
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50"
          placeholder="Search your places..."
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Category filter chips */}
      <View className="bg-white pb-3 border-b border-gray-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            className={`rounded-full px-3 py-1.5 ${
              selectedCategory === null ? "bg-primary-600" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                selectedCategory === null ? "text-white" : "text-gray-600"
              }`}
            >
              All
            </Text>
          </TouchableOpacity>
          {PLACE_CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() =>
                  setSelectedCategory(isActive ? null : cat)
                }
                className={`rounded-full px-3 py-1.5 flex-row items-center ${
                  isActive ? "bg-primary-600" : "bg-gray-100"
                }`}
              >
                <Text className="text-xs mr-1">{config.icon}</Text>
                <Text
                  className={`text-xs font-medium ${
                    isActive ? "text-white" : "text-gray-600"
                  }`}
                >
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Places list */}
      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.placeId}
        contentContainerStyle={{ padding: 16 }}
        onRefresh={refetch}
        refreshing={isLoading}
        ListHeaderComponent={
          filteredPlaces.length > 0 ? (
            <Text className="text-xs text-gray-400 mb-3">
              {filteredPlaces.length} place
              {filteredPlaces.length !== 1 ? "s" : ""}
              {selectedCategory
                ? ` in ${CATEGORY_CONFIG[selectedCategory].label}`
                : ""}
              {searchText.trim() ? ` matching "${searchText}"` : ""}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center mt-16">
            {searchText.trim() || selectedCategory ? (
              <>
                <Text className="text-4xl mb-3">🔍</Text>
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  No matches
                </Text>
                <Text className="text-sm text-gray-500 text-center px-8">
                  Try a different search or category filter.
                </Text>
              </>
            ) : (
              <>
                <Text className="text-5xl mb-4">📍</Text>
                <Text className="text-lg font-semibold text-gray-900 mb-1">
                  No places yet
                </Text>
                <Text className="text-sm text-gray-500 text-center px-8">
                  Search for a place in the Search tab and save it to start
                  taking notes.
                </Text>
              </>
            )}
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
