/**
 * Tests for geofencing utilities and hot-list logic.
 *
 * We test the pure logic (nearest-place selection, geofence limits)
 * rather than the OS geofencing APIs which require a real device.
 */
import { distanceMeters, isWithinRadius } from "@/utils/geo";
import {
  MAX_GEOFENCES_IOS,
  MAX_GEOFENCES_ANDROID,
  DEFAULT_PROXIMITY_RADIUS_METERS,
} from "@/constants/config";

interface MockPlace {
  placeId: string;
  placeName: string;
  latitude: number;
  longitude: number;
}

/**
 * Simulate the hot-list selection: given a list of places and a current
 * location, return the nearest N places (where N is the OS geofence limit).
 */
function selectNearestPlaces(
  places: MockPlace[],
  currentLocation: { latitude: number; longitude: number },
  maxGeofences: number
) {
  return places
    .map((p) => ({
      ...p,
      distance: distanceMeters(currentLocation, {
        latitude: p.latitude,
        longitude: p.longitude,
      }),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxGeofences);
}

describe("hot-list selection", () => {
  const currentLocation = { latitude: 40.7128, longitude: -74.006 }; // NYC

  const places: MockPlace[] = [
    { placeId: "1", placeName: "Nearby Cafe", latitude: 40.713, longitude: -74.005 },
    { placeId: "2", placeName: "Close Restaurant", latitude: 40.715, longitude: -74.008 },
    { placeId: "3", placeName: "Medium Shop", latitude: 40.72, longitude: -74.01 },
    { placeId: "4", placeName: "Far Park", latitude: 40.75, longitude: -74.03 },
    { placeId: "5", placeName: "Very Far Office", latitude: 40.8, longitude: -74.1 },
  ];

  it("returns all places when under the limit", () => {
    const selected = selectNearestPlaces(places, currentLocation, 20);
    expect(selected).toHaveLength(5);
  });

  it("respects the iOS geofence limit", () => {
    // Create more places than the iOS limit
    const manyPlaces: MockPlace[] = Array.from({ length: 30 }, (_, i) => ({
      placeId: `place-${i}`,
      placeName: `Place ${i}`,
      latitude: 40.7128 + i * 0.001,
      longitude: -74.006 + i * 0.001,
    }));

    const selected = selectNearestPlaces(
      manyPlaces,
      currentLocation,
      MAX_GEOFENCES_IOS
    );
    expect(selected).toHaveLength(MAX_GEOFENCES_IOS);
  });

  it("sorts by distance (nearest first)", () => {
    const selected = selectNearestPlaces(places, currentLocation, 20);
    for (let i = 1; i < selected.length; i++) {
      expect(selected[i].distance).toBeGreaterThanOrEqual(
        selected[i - 1].distance
      );
    }
  });

  it("selects the closest places when limited", () => {
    const selected = selectNearestPlaces(places, currentLocation, 2);
    expect(selected).toHaveLength(2);
    expect(selected[0].placeName).toBe("Nearby Cafe");
    expect(selected[1].placeName).toBe("Close Restaurant");
  });
});

describe("proximity check", () => {
  const center = { latitude: 40.7128, longitude: -74.006 };

  it("detects a place within proximity radius", () => {
    // ~30m away
    const nearby = { latitude: 40.7130, longitude: -74.0058 };
    expect(
      isWithinRadius(center, nearby, DEFAULT_PROXIMITY_RADIUS_METERS)
    ).toBe(true);
  });

  it("rejects a place outside proximity radius", () => {
    // ~5km away
    const far = { latitude: 40.75, longitude: -74.03 };
    expect(
      isWithinRadius(center, far, DEFAULT_PROXIMITY_RADIUS_METERS)
    ).toBe(false);
  });

  it("works with custom radius", () => {
    // ~5km away, using a 10km radius
    const medium = { latitude: 40.75, longitude: -74.03 };
    expect(isWithinRadius(center, medium, 10_000)).toBe(true);
    expect(isWithinRadius(center, medium, 100)).toBe(false);
  });
});

describe("geofence constants", () => {
  it("iOS limit is 20", () => {
    expect(MAX_GEOFENCES_IOS).toBe(20);
  });

  it("Android limit is 100", () => {
    expect(MAX_GEOFENCES_ANDROID).toBe(100);
  });

  it("default proximity radius is 200m", () => {
    expect(DEFAULT_PROXIMITY_RADIUS_METERS).toBe(200);
  });
});
