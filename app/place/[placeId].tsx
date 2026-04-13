import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getPlace } from "@/services/places";
import { usePlaceNotes, useDeleteNote } from "@/hooks/useNotes";
import { useDeletePlace } from "@/hooks/usePlaces";
import { NoteCard } from "@/components/notes/NoteCard";
import { CATEGORY_CONFIG } from "@/constants/categories";
import { formatDate } from "@/utils/formatters";

export default function PlaceDetailScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();

  const placeQuery = useQuery({
    queryKey: ["place", placeId],
    queryFn: () => getPlace(placeId!),
    enabled: !!placeId,
  });

  const notesQuery = usePlaceNotes(placeId!);
  const deletePlaceMutation = useDeletePlace();
  const deleteNoteMutation = useDeleteNote(placeId!);

  const place = placeQuery.data;
  const notes = notesQuery.data ?? [];
  const cat = place ? CATEGORY_CONFIG[place.category] : null;

  function handleDeletePlace() {
    Alert.alert(
      "Delete Place",
      `Delete "${place?.name}" and all its notes? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePlaceMutation.mutateAsync(placeId!);
            router.back();
          },
        },
      ]
    );
  }

  function handleDeleteNote(noteId: string) {
    Alert.alert("Delete Note", "Delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteNoteMutation.mutate(noteId),
      },
    ]);
  }

  if (placeQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!place) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Place not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: place.name,
          headerRight: () => (
            <TouchableOpacity onPress={handleDeletePlace} className="mr-2">
              <Text className="text-red-500 text-sm">Delete</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View className="flex-1 bg-gray-50">
        {/* Place header */}
        <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-100">
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl mr-2">{cat?.icon}</Text>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">
                {place.name}
              </Text>
              <Text className="text-sm text-gray-500">{place.address}</Text>
            </View>
          </View>

          {place.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1 mt-2">
              {place.tags.map((tag) => (
                <View
                  key={tag}
                  className="bg-gray-100 rounded-full px-2 py-0.5"
                >
                  <Text className="text-xs text-gray-600">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Notes list */}
        <FlatList
          data={notes}
          keyExtractor={(item) => item.noteId}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Notes ({notes.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            notesQuery.isLoading ? (
              <ActivityIndicator className="mt-8" color="#2563eb" />
            ) : (
              <View className="items-center mt-8">
                <Text className="text-4xl mb-2">📝</Text>
                <Text className="text-sm text-gray-500">
                  No notes yet. Add your first note!
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() =>
                router.push(`/place/${placeId}/note/${item.noteId}`)
              }
            />
          )}
        />

        {/* Add note FAB */}
        <TouchableOpacity
          onPress={() => router.push(`/place/${placeId}/add-note`)}
          className="absolute bottom-6 right-6 bg-primary-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text className="text-white text-2xl font-light">+</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
