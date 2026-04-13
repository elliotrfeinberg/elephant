import { View, Text, TouchableOpacity } from "react-native";
import { CATEGORY_CONFIG } from "@/constants/categories";
import { formatRelativeTime } from "@/utils/formatters";
import type { Place } from "@/types";

interface PlaceCardProps {
  place: Place;
  onPress: () => void;
  distance?: string;
  /** Whether the current user is NOT the owner (it's shared to them) */
  isSharedToMe?: boolean;
}

export function PlaceCard({ place, onPress, distance, isSharedToMe }: PlaceCardProps) {
  const cat = CATEGORY_CONFIG[place.category];

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`bg-white border rounded-xl p-4 mb-3 ${
        isSharedToMe ? "border-blue-200" : "border-gray-100"
      }`}
    >
      <View className="flex-row items-center mb-2">
        <Text className="text-xl mr-2">{cat.icon}</Text>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-gray-900">
              {place.name}
            </Text>
            {isSharedToMe && (
              <View className="bg-blue-100 rounded-full px-1.5 py-0.5">
                <Text className="text-[10px] text-blue-700">Shared</Text>
              </View>
            )}
          </View>
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
