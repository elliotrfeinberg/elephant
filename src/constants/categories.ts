export const PLACE_CATEGORIES = [
  "restaurant",
  "cafe",
  "bar",
  "shop",
  "park",
  "office",
  "home",
  "other",
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const CATEGORY_CONFIG: Record<
  PlaceCategory,
  { label: string; icon: string; color: string }
> = {
  restaurant: { label: "Restaurant", icon: "🍽️", color: "#ef4444" },
  cafe: { label: "Café", icon: "☕", color: "#f59e0b" },
  bar: { label: "Bar", icon: "🍺", color: "#8b5cf6" },
  shop: { label: "Shop", icon: "🛍️", color: "#3b82f6" },
  park: { label: "Park", icon: "🌳", color: "#22c55e" },
  office: { label: "Office", icon: "🏢", color: "#6b7280" },
  home: { label: "Home", icon: "🏠", color: "#ec4899" },
  other: { label: "Other", icon: "📍", color: "#64748b" },
};
