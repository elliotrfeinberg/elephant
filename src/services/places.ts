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
    sharedWith: [],
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
 * Get all places owned by or shared with a user.
 */
export async function getUserPlaces(userId: string): Promise<Place[]> {
  // Query owned places
  const ownedQuery = query(
    collection(db, PLACES_COL),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc")
  );

  // Query places shared with this user
  const sharedQuery = query(
    collection(db, PLACES_COL),
    where("sharedWith", "array-contains", userId)
  );

  const [ownedSnap, sharedSnap] = await Promise.all([
    getDocs(ownedQuery),
    getDocs(sharedQuery),
  ]);

  const seen = new Set<string>();
  const places: Place[] = [];

  for (const d of ownedSnap.docs) {
    seen.add(d.id);
    places.push({ placeId: d.id, ...d.data() } as Place);
  }

  for (const d of sharedSnap.docs) {
    if (!seen.has(d.id)) {
      places.push({ placeId: d.id, ...d.data() } as Place);
    }
  }

  // Sort by updatedAt descending
  places.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());

  return places;
}

/**
 * Get places near a location using geohash range queries.
 * Includes both owned and shared places.
 */
export async function getPlacesNear(
  userId: string,
  center: LatLng,
  radiusMeters: number
): Promise<Place[]> {
  const bounds = getGeohashBounds(center, radiusMeters);

  // Query owned places by geohash bounds
  const ownedPromises = bounds.map(([start, end]) => {
    const q = query(
      collection(db, PLACES_COL),
      where("userId", "==", userId),
      where("geohash", ">=", start),
      where("geohash", "<=", end)
    );
    return getDocs(q);
  });

  // Also fetch shared places (can't combine array-contains with geohash range,
  // so we fetch all shared places and post-filter by distance)
  const sharedQuery = query(
    collection(db, PLACES_COL),
    where("sharedWith", "array-contains", userId)
  );

  const [ownedSnapshots, sharedSnap] = await Promise.all([
    Promise.all(ownedPromises),
    getDocs(sharedQuery),
  ]);

  const places: Place[] = [];
  const seen = new Set<string>();

  // Process owned places from geohash queries
  for (const snap of ownedSnapshots) {
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

  // Process shared places (post-filter by distance)
  for (const d of sharedSnap.docs) {
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

  return places;
}

/**
 * Update a place.
 */
export async function updatePlace(
  placeId: string,
  updates: Partial<Pick<Place, "name" | "address" | "category" | "tags" | "isPublic">>
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
