import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";

/**
 * Configure notification handler (how notifications appear when app is foregrounded).
 */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permissions.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Set up the listener that handles notification taps (deep linking).
 * Returns a cleanup function.
 */
export function setupNotificationResponseListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      if (data?.placeId) {
        router.push(`/place/${data.placeId}`);
      }
    }
  );

  return () => subscription.remove();
}

/**
 * Fire a local notification when the user enters a geofenced place.
 */
export async function sendGeofenceEntryNotification(
  placeId: string,
  placeName: string,
  notePreview?: string
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `📍 You're near ${placeName}`,
      body: notePreview
        ? `Your note: "${notePreview}"`
        : "Tap to see your notes for this place.",
      data: { placeId },
      sound: true,
    },
    trigger: null, // Fire immediately
  });
}
