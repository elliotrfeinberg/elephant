import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getNote } from "@/services/notes";
import { useUpdateNote, useDeleteNote } from "@/hooks/useNotes";
import { RatingPicker } from "@/components/notes/RatingPicker";
import { formatDate } from "@/utils/formatters";

export default function NoteDetailScreen() {
  const { placeId, noteId } = useLocalSearchParams<{
    placeId: string;
    noteId: string;
  }>();
  const router = useRouter();

  const noteQuery = useQuery({
    queryKey: ["note", placeId, noteId],
    queryFn: () => getNote(placeId!, noteId!),
    enabled: !!placeId && !!noteId,
  });

  const updateNote = useUpdateNote(placeId!, noteId!);
  const deleteNoteMutation = useDeleteNote(placeId!);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editRating, setEditRating] = useState<number | null>(null);

  const note = noteQuery.data;

  function startEditing() {
    if (!note) return;
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditRating(note.rating);
    setIsEditing(true);
  }

  async function handleSave() {
    try {
      await updateNote.mutateAsync({
        title: editTitle.trim(),
        body: editBody.trim(),
        rating: editRating,
      });
      setIsEditing(false);
      noteQuery.refetch();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to update note.");
    }
  }

  function handleDelete() {
    Alert.alert("Delete Note", "Delete this note? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteNoteMutation.mutateAsync(noteId!);
          router.back();
        },
      },
    ]);
  }

  if (noteQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!note) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Note not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? "Edit Note" : "Note",
          headerRight: () => (
            <View className="flex-row items-center gap-3 mr-2">
              {isEditing ? (
                <>
                  <TouchableOpacity onPress={() => setIsEditing(false)}>
                    <Text className="text-gray-500 text-sm">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave}>
                    {updateNote.isPending ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <Text className="text-primary-600 font-semibold text-sm">
                        Save
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={startEditing}>
                    <Text className="text-primary-600 text-sm">Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete}>
                    <Text className="text-red-500 text-sm">Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <ScrollView className="flex-1 px-4 pt-4">
          {isEditing ? (
            <>
              <TextInput
                className="text-xl font-semibold text-gray-900 mb-4"
                value={editTitle}
                onChangeText={setEditTitle}
                autoFocus
              />
              <View className="mb-4">
                <Text className="text-sm text-gray-500 mb-2">Rating</Text>
                <RatingPicker value={editRating} onChange={setEditRating} />
              </View>
              <TextInput
                className="text-base text-gray-700 min-h-[200px]"
                value={editBody}
                onChangeText={setEditBody}
                multiline
                textAlignVertical="top"
              />
            </>
          ) : (
            <>
              <Text className="text-xl font-bold text-gray-900 mb-2">
                {note.title}
              </Text>

              <View className="flex-row items-center gap-3 mb-4">
                {note.rating !== null && (
                  <Text className="text-base text-amber-500">
                    {"★".repeat(note.rating)}
                    {"☆".repeat(5 - note.rating)}
                  </Text>
                )}
                <Text className="text-xs text-gray-400">
                  {formatDate(note.visitedAt)}
                </Text>
              </View>

              <Text className="text-base text-gray-700 leading-6">
                {note.body || "No additional notes."}
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
