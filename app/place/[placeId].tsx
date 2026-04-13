import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlace, updatePlace } from "@/services/places";
import { usePlaceNotes } from "@/hooks/useNotes";
import { useDeletePlace } from "@/hooks/usePlaces";
import { useAuthStore } from "@/stores/authStore";
import { NoteCard } from "@/components/notes/NoteCard";
import { ShareModal } from "@/components/places/ShareModal";
import { CATEGORY_CONFIG } from "@/constants/categories";

export default function PlaceDetailScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.uid);
  const queryClient = useQueryClient();

  const [shareModalVisible, setShareModalVisible] = useState(false);

  const placeQuery = useQuery({
    queryKey: ["place", placeId],
    queryFn: () => getPlace(placeId!),
    enabled: !!placeId,
  });

  const notesQuery = usePlaceNotes(placeId!);
  const deletePlaceMutation = useDeletePlace();

  const place = placeQuery.data;
  const notes = notesQuery.data ?? [];
  const cat = place ? CATEGORY_CONFIG[place.category] : null;
  const isOwner = place?.userId === userId;
  const isShared = (place?.sharedWith?.length ?? 0) > 0;

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

  async function handleTogglePublic(value: boolean) {
    if (!placeId) return;
    try {
      await updatePlace(placeId, { isPublic: value });
      queryClient.invalidateQueries({ queryKey: ["place", placeId] });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to update.");
    }
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
            <View className="flex-row items-center gap-3 mr-2">
              <TouchableOpacity onPress={() => setShareModalVisible(true)}>
                <Text className="text-primary-600 text-sm">Share</Text>
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity onPress={handleDeletePlace}>
                  <Text className="text-red-500 text-sm">Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />
      <View className="flex-1 bg-gray-50">
        {/* Place header */}
        <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-100">
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl mr-2">{cat?.icon}</Text>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-xl font-bold text-gray-900">
                  {place.name}
                </Text>
                {!isOwner && (
                  <View className="bg-blue-100 rounded-full px-2 py-0.5">
                    <Text className="text-xs text-blue-700">Shared</Text>
                  </View>
                )}
              </View>
              <Text className="text-sm text-gray-500">{place.address}</Text>
            </View>
          </View>

          {/* Tags */}
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

          {/* Sharing info bar */}
          {isShared && (
            <TouchableOpacity
              onPress={() => setShareModalVisible(true)}
              className="flex-row items-center mt-3 bg-blue-50 rounded-lg px-3 py-2"
            >
              <Text className="text-xs text-blue-700 flex-1">
                Shared with {place.sharedWith.length} person
                {place.sharedWith.length !== 1 ? "s" : ""}
              </Text>
              <Text className="text-xs text-blue-500">Manage</Text>
            </TouchableOpacity>
          )}

          {/* Privacy toggle (owner only) */}
          {isOwner && (
            <View className="flex-row items-center justify-between mt-3">
              <View>
                <Text className="text-sm text-gray-700">Public place</Text>
                <Text className="text-xs text-gray-400">
                  Visible to shared users' friends
                </Text>
              </View>
              <Switch
                value={place.isPublic}
                onValueChange={handleTogglePublic}
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={place.isPublic ? "#2563eb" : "#f4f4f5"}
              />
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

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        placeId={placeId!}
        placeName={place.name}
        isOwner={isOwner}
      />
    </>
  );
}
