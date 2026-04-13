import { View, Text, TouchableOpacity } from "react-native";
import { formatRelativeTime, truncate } from "@/utils/formatters";
import type { Note } from "@/types";

interface NoteCardProps {
  note: Note;
  onPress: () => void;
}

export function NoteCard({ note, onPress }: NoteCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white border border-gray-100 rounded-xl p-4 mb-3"
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-base font-semibold text-gray-900 flex-1">
          {note.title}
        </Text>
        {note.rating !== null && (
          <Text className="text-sm text-amber-500 ml-2">
            {"★".repeat(note.rating)}
          </Text>
        )}
      </View>

      {note.body ? (
        <Text className="text-sm text-gray-600 mb-2">
          {truncate(note.body, 120)}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-gray-400">
          {formatRelativeTime(note.createdAt)}
        </Text>
        {note.photos.length > 0 && (
          <Text className="text-xs text-gray-400">
            {note.photos.length} photo{note.photos.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
