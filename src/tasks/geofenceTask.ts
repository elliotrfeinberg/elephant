import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/services/firebase";
import { auth } from "@/services/firebase";
import { sendGeofenceEntryNotification } from "@/services/notifications";
import { handleLocationUpdate, GEOFENCE_TASK_NAME } from "@/services/geofencing";
import { useGeofenceStore } from "@/stores/geofenceStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { truncate } from "@/utils/formatters";

const LOCATION_UPDATE_TASK_NAME = "elephant-location-update-task";

/**
 * Background task: Geofence entry detection.
 *
 * Fires when the user enters a registered geofence region.
 * Looks up the place and its most recent note, then sends
 * a local notification.
 */
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("[GeofenceTask] Error:", error.message);
    return;
  }

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  if (eventType !== Location.GeofencingEventType.Enter) return;

  const placeId = region.identifier;
  if (!placeId) return;

  // Check if notifications are enabled
  const { notificationsEnabled } = useSettingsStore.getState();
  if (!notificationsEnabled) return;

  try {
    // Find the place name from our geofence store
    const { activeGeofences } = useGeofenceStore.getState();
    const geofence = activeGeofences.find((g) => g.placeId === placeId);
    const placeName = geofence?.placeName ?? "a saved place";

    // Fetch the most recent note for a preview
    let notePreview: string | undefined;
    try {
      const notesQuery = query(
        collection(db, "places", placeId, "notes"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(notesQuery);
      if (!snap.empty) {
        const note = snap.docs[0].data();
        notePreview = truncate(note.body || note.title, 80);
      }
    } catch {
      // Non-critical — send notification without preview
    }

    await sendGeofenceEntryNotification(placeId, placeName, notePreview);
  } catch (e) {
    console.error("[GeofenceTask] Failed to send notification:", e);
  }
});

/**
 * Background task: Significant location change.
 *
 * Fires when the user moves ~500m. Re-registers geofences
 * for the nearest places from the new location (hot-list refresh).
 */
TaskManager.defineTask(
  LOCATION_UPDATE_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error("[LocationUpdateTask] Error:", error.message);
      return;
    }

    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const latest = locations[locations.length - 1];
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const { proximityRadius } = useSettingsStore.getState();

    try {
      await handleLocationUpdate(
        userId,
        {
          latitude: latest.coords.latitude,
          longitude: latest.coords.longitude,
        },
        proximityRadius
      );
    } catch (e) {
      console.error("[LocationUpdateTask] Failed to update geofences:", e);
    }
  }
);
