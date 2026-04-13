import { HERE_API_KEY } from "@/constants/config";
import type { LatLng } from "@/utils/geo";

const BASE_URL = "https://autosuggest.search.hereapi.com/v1";
const DISCOVER_URL = "https://discover.search.hereapi.com/v1";

export interface HerePlaceResult {
  id: string;
  title: string;
  address: {
    label: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryName?: string;
  };
  position: {
    lat: number;
    lng: number;
  };
  categories?: { id: string; name: string }[];
}

/**
 * Autocomplete search for places.
 * Used as the user types in the search bar.
 */
export async function autocompletePlaces(
  query: string,
  location?: LatLng
): Promise<HerePlaceResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    apiKey: HERE_API_KEY,
    limit: "10",
    resultType: "place",
  });

  if (location) {
    params.set("at", `${location.latitude},${location.longitude}`);
  }

  const response = await fetch(`${BASE_URL}/autosuggest?${params}`);
  if (!response.ok) {
    throw new Error(`HERE API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.items ?? [])
    .filter((item: any) => item.position)
    .map(mapHereItem);
}

/**
 * Search for places near a location (for map discovery).
 */
export async function discoverPlaces(
  query: string,
  location: LatLng
): Promise<HerePlaceResult[]> {
  const params = new URLSearchParams({
    q: query,
    apiKey: HERE_API_KEY,
    at: `${location.latitude},${location.longitude}`,
    limit: "20",
  });

  const response = await fetch(`${DISCOVER_URL}/discover?${params}`);
  if (!response.ok) {
    throw new Error(`HERE API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.items ?? [])
    .filter((item: any) => item.position)
    .map(mapHereItem);
}

/**
 * Reverse geocode a lat/lng to an address string.
 */
export async function reverseGeocode(location: LatLng): Promise<string> {
  const params = new URLSearchParams({
    at: `${location.latitude},${location.longitude}`,
    apiKey: HERE_API_KEY,
    limit: "1",
  });

  const response = await fetch(
    `https://revgeocode.search.hereapi.com/v1/revgeocode?${params}`
  );
  if (!response.ok) {
    throw new Error(`HERE API error: ${response.status}`);
  }

  const data = await response.json();
  return data.items?.[0]?.address?.label ?? "Unknown location";
}

function mapHereItem(item: any): HerePlaceResult {
  return {
    id: item.id,
    title: item.title,
    address: {
      label: item.address?.label ?? "",
      street: item.address?.street,
      city: item.address?.city,
      state: item.address?.state,
      postalCode: item.address?.postalCode,
      countryName: item.address?.countryName,
    },
    position: {
      lat: item.position.lat,
      lng: item.position.lng,
    },
    categories: item.categories ?? [],
  };
}
