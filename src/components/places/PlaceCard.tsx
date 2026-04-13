import { View, Text, TouchableOpacity } from "react-native";
import { CATEGORY_CONFIG } from "@/constants/categories";
import { formatRelativeTime } from "@/utils/formatters";
import type { Place } from "@/types";

interface PlaceCardProps {
  place: Place;
  onPress: () => void;
  distance?: string;
}

export function PlaceCard({ place, onPress, distance }: PlaceCardProps) {
  const cat = CATEGORY_CONFIG[place.category];

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white border border-gray-100 rounded-xl p-4 mb-3"
    >
      <View className="flex-row items-center mb-2">
        <Text className="text-xl mr-2">{cat.icon}</Text>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">
            {place.name}
          </Text>
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {place.address}
          </Text>
        </View>
        {distance && (
          <Text className="text-xs text-gray-400 ml-2">{distance}</Text>
        )}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-gray-400">
          {place.noteCount} note{place.noteCount !== 1 ? "s" : ""}
        </Text>
        {place.lastNoteAt && (
          <Text className="text-xs text-gray-400">
            Last note {formatRelativeTime(place.lastNoteAt)}
          </Text>
        )}
      </View>

      {place.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1 mt-2">
          {place.tags.map((tag) => (
            <View key={tag} className="bg-gray-100 rounded-full px-2 py-0.5">
              <Text className="text-xs text-gray-600">{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
