import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useCreatePlace } from "@/hooks/usePlaces";
import { PLACE_CATEGORIES, type PlaceCategory } from "@/constants/categories";
import { CATEGORY_CONFIG } from "@/constants/categories";
import type { HerePlaceResult } from "@/services/herePlaces";

export default function SearchScreen() {
  const { location } = useCurrentLocation();
  const { query, setQuery, results, isSearching, error } =
    usePlaceSearch(location);
  const createPlace = useCreatePlace();
  const router = useRouter();

  const [selectedPlace, setSelectedPlace] = useState<HerePlaceResult | null>(
    null
  );
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  function handleSelectResult(item: HerePlaceResult) {
    setSelectedPlace(item);
    setCategoryPickerVisible(true);
  }

  async function handleSavePlace(category: PlaceCategory) {
    if (!selectedPlace) return;
    setCategoryPickerVisible(false);

    try {
      const place = await createPlace.mutateAsync({
        name: selectedPlace.title,
        address: selectedPlace.address.label,
        externalPlaceId: selectedPlace.id,
        latitude: selectedPlace.position.lat,
        longitude: selectedPlace.position.lng,
        category,
      });
      setQuery("");
      router.push(`/place/${place.placeId}`);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save place.");
    }
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-2">
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50"
          placeholder="Search for a place..."
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {isSearching && (
        <ActivityIndicator className="mt-4" color="#2563eb" />
      )}

      {error && (
        <Text className="text-sm text-red-500 px-4 mt-2">{error}</Text>
      )}

      {!query.trim() && !isSearching && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🔍</Text>
          <Text className="text-base text-gray-500 text-center">
            Search for restaurants, cafes, shops, and more to save notes about.
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelectResult(item)}
            className="py-3 border-b border-gray-100"
          >
            <Text className="text-base font-medium text-gray-900">
              {item.title}
            </Text>
            <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
              {item.address.label}
            </Text>
            {item.categories && item.categories.length > 0 && (
              <Text className="text-xs text-gray-400 mt-0.5">
                {item.categories.map((c) => c.name).join(", ")}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={categoryPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              Save "{selectedPlace?.title}"
            </Text>
            <Text className="text-sm text-gray-500 mb-4">
              Pick a category:
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PLACE_CATEGORIES.map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => handleSavePlace(cat)}
                    className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center"
                    style={{ minWidth: "45%" }}
                  >
                    <Text className="text-xl mr-2">{config.icon}</Text>
                    <Text className="text-sm font-medium text-gray-900">
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setCategoryPickerVisible(false)}
              className="mt-4 py-3 items-center"
            >
              <Text className="text-sm text-gray-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
