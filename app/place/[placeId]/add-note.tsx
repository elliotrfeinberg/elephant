import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useCreateNote } from "@/hooks/useNotes";
import { RatingPicker } from "@/components/notes/RatingPicker";

export default function AddNoteScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();
  const createNote = useCreateNote(placeId!);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for your note.");
      return;
    }

    try {
      await createNote.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        rating,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save note.");
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Add Note",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={createNote.isPending}
              className="mr-2"
            >
              {createNote.isPending ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text className="text-primary-600 font-semibold text-base">
                  Save
                </Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <ScrollView className="flex-1 px-4 pt-4">
          <TextInput
            className="text-xl font-semibold text-gray-900 mb-4"
            placeholder="Note title"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-2">Rating (optional)</Text>
            <RatingPicker value={rating} onChange={setRating} />
          </View>

          <TextInput
            className="text-base text-gray-700 min-h-[200px]"
            placeholder="Write your notes here...&#10;&#10;e.g., Don't order the moules frites — their version isn't great. Portions are huge, so don't over-order."
            placeholderTextColor="#9ca3af"
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
