import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Note, NoteInput } from "@/types";

function notesCollection(placeId: string) {
  return collection(db, "places", placeId, "notes");
}

/**
 * Create a new note for a place.
 */
export async function createNote(
  userId: string,
  placeId: string,
  input: NoteInput
): Promise<Note> {
  const now = Timestamp.now();

  const data = {
    userId,
    placeId,
    title: input.title,
    body: input.body,
    rating: input.rating ?? null,
    photos: input.photos ?? [],
    visitedAt: input.visitedAt ? Timestamp.fromDate(input.visitedAt) : now,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(notesCollection(placeId), data);

  // Update place noteCount and lastNoteAt
  await updateDoc(doc(db, "places", placeId), {
    noteCount: increment(1),
    lastNoteAt: now,
    updatedAt: now,
  });

  return { noteId: docRef.id, ...data } as Note;
}

/**
 * Get all notes for a place, newest first.
 */
export async function getPlaceNotes(placeId: string): Promise<Note[]> {
  const q = query(notesCollection(placeId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ noteId: d.id, ...d.data() }) as Note);
}

/**
 * Get a single note.
 */
export async function getNote(
  placeId: string,
  noteId: string
): Promise<Note | null> {
  const snap = await getDoc(doc(db, "places", placeId, "notes", noteId));
  if (!snap.exists()) return null;
  return { noteId: snap.id, ...snap.data() } as Note;
}

/**
 * Update a note.
 */
export async function updateNote(
  placeId: string,
  noteId: string,
  updates: Partial<Pick<NoteInput, "title" | "body" | "rating" | "photos">>
): Promise<void> {
  await updateDoc(doc(db, "places", placeId, "notes", noteId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete a note.
 */
export async function deleteNote(
  placeId: string,
  noteId: string
): Promise<void> {
  await deleteDoc(doc(db, "places", placeId, "notes", noteId));

  // Decrement noteCount on the place
  await updateDoc(doc(db, "places", placeId), {
    noteCount: increment(-1),
    updatedAt: Timestamp.now(),
  });
}
