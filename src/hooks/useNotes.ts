import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import {
  getPlaceNotes,
  createNote,
  updateNote,
  deleteNote,
} from "@/services/notes";
import type { NoteInput } from "@/types";

export function usePlaceNotes(placeId: string) {
  return useQuery({
    queryKey: ["notes", placeId],
    queryFn: () => getPlaceNotes(placeId),
    enabled: !!placeId,
  });
}

export function useCreateNote(placeId: string) {
  const userId = useAuthStore((s) => s.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NoteInput) => createNote(userId!, placeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", placeId] });
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
  });
}

export function useUpdateNote(placeId: string, noteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<NoteInput>) =>
      updateNote(placeId, noteId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", placeId] });
    },
  });
}

export function useDeleteNote(placeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => deleteNote(placeId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", placeId] });
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
  });
}
