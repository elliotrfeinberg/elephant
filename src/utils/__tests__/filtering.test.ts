import type { PlaceCategory } from "@/constants/categories";

/**
 * Tests for place filtering logic (mirrors the useMemo in places.tsx).
 * Extracted as pure functions for testability.
 */

interface MockPlace {
  placeId: string;
  name: string;
  address: string;
  category: PlaceCategory;
  tags: string[];
}

function filterPlaces(
  places: MockPlace[],
  category: PlaceCategory | null,
  searchText: string
): MockPlace[] {
  let result = places;

  if (category) {
    result = result.filter((p) => p.category === category);
  }

  if (searchText.trim()) {
    const query = searchText.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query))
    );
  }

  return result;
}

const places: MockPlace[] = [
  {
    placeId: "1",
    name: "Joe's Pizza",
    address: "123 Main St, New York",
    category: "restaurant",
    tags: ["pizza", "cheap"],
  },
  {
    placeId: "2",
    name: "Central Park",
    address: "Central Park, New York",
    category: "park",
    tags: ["outdoor", "running"],
  },
  {
    placeId: "3",
    name: "Blue Bottle Coffee",
    address: "456 Broadway, New York",
    category: "cafe",
    tags: ["coffee", "work"],
  },
  {
    placeId: "4",
    name: "The Fancy Restaurant",
    address: "789 5th Ave, New York",
    category: "restaurant",
    tags: ["expensive", "date night"],
  },
];

describe("filterPlaces", () => {
  it("returns all places with no filters", () => {
    expect(filterPlaces(places, null, "")).toHaveLength(4);
  });

  it("filters by category", () => {
    const result = filterPlaces(places, "restaurant", "");
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.category === "restaurant")).toBe(true);
  });

  it("filters by search text in name", () => {
    const result = filterPlaces(places, null, "pizza");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Joe's Pizza");
  });

  it("filters by search text in address", () => {
    const result = filterPlaces(places, null, "Broadway");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Blue Bottle Coffee");
  });

  it("filters by search text in tags", () => {
    const result = filterPlaces(places, null, "running");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Central Park");
  });

  it("combines category and search filters", () => {
    const result = filterPlaces(places, "restaurant", "fancy");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("The Fancy Restaurant");
  });

  it("search is case-insensitive", () => {
    const result = filterPlaces(places, null, "PIZZA");
    expect(result).toHaveLength(1);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterPlaces(places, null, "sushi")).toHaveLength(0);
  });

  it("ignores whitespace-only search", () => {
    expect(filterPlaces(places, null, "   ")).toHaveLength(4);
  });

  it("matches partial strings", () => {
    const result = filterPlaces(places, null, "coff");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Blue Bottle Coffee");
  });
});
