import { geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common";

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Generate a geohash string for a lat/lng pair.
 * Used when saving a place to Firestore for geo queries.
 */
export function computeGeohash(lat: number, lng: number): string {
  return geohashForLocation([lat, lng]);
}

/**
 * Get Firestore query bounds for a radius search.
 * Returns [startHash, endHash] pairs for parallel Firestore range queries.
 */
export function getGeohashBounds(
  center: LatLng,
  radiusMeters: number
): [string, string][] {
  return geohashQueryBounds(
    [center.latitude, center.longitude],
    radiusMeters
  );
}

/**
 * Distance in meters between two points (Haversine).
 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  // geofire-common returns distance in km
  return (
    distanceBetween(
      [a.latitude, a.longitude],
      [b.latitude, b.longitude]
    ) * 1000
  );
}

/**
 * Check if a point is within a radius of a center point.
 */
export function isWithinRadius(
  center: LatLng,
  point: LatLng,
  radiusMeters: number
): boolean {
  return distanceMeters(center, point) <= radiusMeters;
}
