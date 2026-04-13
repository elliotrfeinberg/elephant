import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  GeoPoint,
} from "firebase/firestore";
import { db } from "./firebase";
import { computeGeohash, getGeohashBounds, isWithinRadius } from "@/utils/geo";
import type { LatLng } from "@/utils/geo";
import type { Place, PlaceInput } from "@/types";

const PLACES_COL = "places";

/**
 * Create a new place in Firestore.
 */
export async function createPlace(
  userId: string,
  input: PlaceInput
): Promise<Place> {
  const geohash = computeGeohash(input.latitude, input.longitude);
  const now = Timestamp.now();

  const data = {
    userId,
    name: input.name,
    address: input.address,
    externalPlaceId: input.externalPlaceId ?? null,
    location: new GeoPoint(input.latitude, input.longitude),
    geohash,
    category: input.category,
    tags: input.tags ?? [],
    noteCount: 0,
    lastNoteAt: null,
    createdAt: now,
    updatedAt: now,
    isPublic: false,
  };

  const docRef = await addDoc(collection(db, PLACES_COL), data);
  return { placeId: docRef.id, ...data } as Place;
}

/**
 * Get a single place by ID.
 */
export async function getPlace(placeId: string): Promise<Place | null> {
  const snap = await getDoc(doc(db, PLACES_COL, placeId));
  if (!snap.exists()) return null;
  return { placeId: snap.id, ...snap.data() } as Place;
}

/**
 * Get all places for a user, ordered by most recent note.
 */
export async function getUserPlaces(userId: string): Promise<Place[]> {
  const q = query(
    collection(db, PLACES_COL),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ placeId: d.id, ...d.data() }) as Place);
}

/**
 * Get places near a location using geohash range queries.
 * This is the core geo query used by the map view.
 */
export async function getPlacesNear(
  userId: string,
  center: LatLng,
  radiusMeters: number
): Promise<Place[]> {
  const bounds = getGeohashBounds(center, radiusMeters);

  // Fire parallel queries for each geohash range
  const queryPromises = bounds.map(([start, end]) => {
    const q = query(
      collection(db, PLACES_COL),
      where("userId", "==", userId),
      where("geohash", ">=", start),
      where("geohash", "<=", end)
    );
    return getDocs(q);
  });

  const snapshots = await Promise.all(queryPromises);

  // Flatten results and post-filter by actual distance (geohash is a bounding box)
  const places: Place[] = [];
  const seen = new Set<string>();

  for (const snap of snapshots) {
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);

      const place = { placeId: d.id, ...d.data() } as Place;
      const point: LatLng = {
        latitude: place.location.latitude,
        longitude: place.location.longitude,
      };

      if (isWithinRadius(center, point, radiusMeters)) {
        places.push(place);
      }
    }
  }

  return places;
}

/**
 * Update a place.
 */
export async function updatePlace(
  placeId: string,
  updates: Partial<Pick<Place, "name" | "address" | "category" | "tags">>
): Promise<void> {
  await updateDoc(doc(db, PLACES_COL, placeId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete a place and all its notes.
 */
export async function deletePlace(placeId: string): Promise<void> {
  // Delete all notes in the subcollection first
  const notesSnap = await getDocs(
    collection(db, PLACES_COL, placeId, "notes")
  );
  const deletePromises = notesSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);

  // Delete the place
  await deleteDoc(doc(db, PLACES_COL, placeId));
}
