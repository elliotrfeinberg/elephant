import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import { distanceMeters, type LatLng } from "@/utils/geo";
import { useGeofenceStore, type GeofenceEntry } from "@/stores/geofenceStore";
import {
  MAX_GEOFENCES_IOS,
  MAX_GEOFENCES_ANDROID,
  DEFAULT_PROXIMITY_RADIUS_METERS,
} from "@/constants/config";

export const GEOFENCE_TASK_NAME = "elephant-geofence-task";
const LOCATION_UPDATE_TASK_NAME = "elephant-location-update-task";

/** OS-imposed limit on simultaneous geofences */
const MAX_GEOFENCES =
  Platform.OS === "ios" ? MAX_GEOFENCES_IOS : MAX_GEOFENCES_ANDROID;

/**
 * Start monitoring geofences for a user's places.
 * This sets up:
 * 1. Geofence regions for the N nearest places
 * 2. Significant location change monitoring to re-register geofences as the user moves
 */
export async function startGeofencing(
  userId: string,
  currentLocation: LatLng,
  radius: number = DEFAULT_PROXIMITY_RADIUS_METERS
): Promise<void> {
  // Get user's places and find the nearest ones
  const nearestPlaces = await getNearestPlaces(userId, currentLocation);

  // Register geofences for the nearest places
  await registerGeofences(nearestPlaces, radius);

  // Start significant location change monitoring to re-register geofences
  // as the user moves around
  await startLocationUpdates(userId, radius);
}

/**
 * Stop all geofencing and location monitoring.
 */
export async function stopGeofencing(): Promise<void> {
  try {
    const isGeofencing = await TaskManager.isTaskRegisteredAsync(
      GEOFENCE_TASK_NAME
    );
    if (isGeofencing) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
  } catch {
    // Task may not be registered
  }

  try {
    const isTracking = await TaskManager.isTaskRegisteredAsync(
      LOCATION_UPDATE_TASK_NAME
    );
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_UPDATE_TASK_NAME);
    }
  } catch {
    // Task may not be registered
  }

  useGeofenceStore.getState().setActiveGeofences([]);
}

/**
 * Fetch the user's places and sort by distance from current location.
 * Returns up to MAX_GEOFENCES entries.
 */
async function getNearestPlaces(
  userId: string,
  currentLocation: LatLng
): Promise<GeofenceEntry[]> {
  const q = query(
    collection(db, "places"),
    where("userId", "==", userId)
  );

  const snap = await getDocs(q);

  const placesWithDistance = snap.docs.map((doc) => {
    const data = doc.data();
    const dist = distanceMeters(currentLocation, {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
    });
    return {
      placeId: doc.id,
      placeName: data.name as string,
      latitude: data.location.latitude as number,
      longitude: data.location.longitude as number,
      distance: dist,
    };
  });

  // Sort by distance, take the nearest N
  placesWithDistance.sort((a, b) => a.distance - b.distance);

  return placesWithDistance.slice(0, MAX_GEOFENCES).map(({ distance, ...entry }) => ({
    ...entry,
    radius: DEFAULT_PROXIMITY_RADIUS_METERS,
  }));
}

/**
 * Register geofence regions with the OS.
 */
async function registerGeofences(
  places: GeofenceEntry[],
  radius: number
): Promise<void> {
  if (places.length === 0) return;

  const regions: Location.LocationRegion[] = places.map((place) => ({
    identifier: place.placeId,
    latitude: place.latitude,
    longitude: place.longitude,
    radius,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);

  // Persist the active geofence list
  useGeofenceStore.getState().setActiveGeofences(
    places.map((p) => ({ ...p, radius }))
  );
}

/**
 * Start significant location change monitoring.
 * When the user moves ~500m, we re-evaluate which places
 * should be geofenced (the "hot list" strategy).
 */
async function startLocationUpdates(
  userId: string,
  radius: number
): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    LOCATION_UPDATE_TASK_NAME
  );
  if (isRegistered) return; // Already running

  await Location.startLocationUpdatesAsync(LOCATION_UPDATE_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 500, // Re-evaluate every ~500m of movement
    deferredUpdatesDistance: 500,
    showsBackgroundLocationIndicator: false,
    foregroundService: Platform.OS === "android" ? {
      notificationTitle: "Elephant",
      notificationBody: "Monitoring nearby places",
      notificationColor: "#2563eb",
    } : undefined,
  });
}

/**
 * Handle a significant location change — re-register geofences
 * for the nearest places from the new location.
 * Called by the background location update task.
 */
export async function handleLocationUpdate(
  userId: string,
  newLocation: LatLng,
  radius: number = DEFAULT_PROXIMITY_RADIUS_METERS
): Promise<void> {
  const nearestPlaces = await getNearestPlaces(userId, newLocation);
  await registerGeofences(nearestPlaces, radius);
}
