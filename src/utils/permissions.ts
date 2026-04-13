import { Alert, Linking, Platform } from "react-native";
import * as Location from "expo-location";

/**
 * Request foreground location permission.
 * Returns true if granted.
 */
export async function requestForegroundLocation(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Location Access Needed",
      "Elephant needs your location to show nearby places on the map.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  return true;
}

/**
 * Request background location permission with a pre-prompt explaining why.
 * iOS requires "Always Allow" for geofencing to work when the app is closed.
 * Returns true if granted.
 */
export async function requestBackgroundLocation(): Promise<boolean> {
  // First ensure foreground permission is granted
  const foreground = await requestForegroundLocation();
  if (!foreground) return false;

  // Check if background permission is already granted
  const { status: bgStatus } =
    await Location.getBackgroundPermissionsAsync();
  if (bgStatus === "granted") return true;

  // Show pre-prompt dialog before the system dialog
  return new Promise((resolve) => {
    Alert.alert(
      "Stay Reminded Nearby",
      Platform.OS === "ios"
        ? 'Elephant can remind you of your notes when you\'re near a saved place — even when the app is closed.\n\nOn the next screen, choose "Allow Always" to enable this.'
        : "Elephant can remind you of your notes when you're near a saved place — even when the app is closed.\n\nPlease allow location access all the time on the next screen.",
      [
        {
          text: "Not Now",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: "Enable",
          onPress: async () => {
            const { status } =
              await Location.requestBackgroundPermissionsAsync();
            resolve(status === "granted");
          },
        },
      ]
    );
  });
}

/**
 * Check if background location is currently granted.
 */
export async function hasBackgroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  return status === "granted";
}
