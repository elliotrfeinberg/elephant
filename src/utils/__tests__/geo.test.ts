import {
  computeGeohash,
  getGeohashBounds,
  distanceMeters,
  isWithinRadius,
} from "../geo";

describe("computeGeohash", () => {
  it("returns a non-empty geohash string", () => {
    const hash = computeGeohash(40.7128, -74.006); // NYC
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("returns different hashes for distant locations", () => {
    const nyc = computeGeohash(40.7128, -74.006);
    const tokyo = computeGeohash(35.6762, 139.6503);
    expect(nyc).not.toBe(tokyo);
  });

  it("returns similar prefixes for nearby locations", () => {
    const a = computeGeohash(40.7128, -74.006);
    const b = computeGeohash(40.7130, -74.0055); // ~30m away
    // Nearby points should share at least the first few characters
    expect(a.slice(0, 5)).toBe(b.slice(0, 5));
  });
});

describe("getGeohashBounds", () => {
  it("returns at least one bound pair", () => {
    const bounds = getGeohashBounds(
      { latitude: 40.7128, longitude: -74.006 },
      1000
    );
    expect(bounds.length).toBeGreaterThan(0);
    bounds.forEach(([start, end]) => {
      expect(typeof start).toBe("string");
      expect(typeof end).toBe("string");
      expect(start < end).toBe(true);
    });
  });

  it("returns more bounds for larger radii", () => {
    const small = getGeohashBounds(
      { latitude: 40.7128, longitude: -74.006 },
      100
    );
    const large = getGeohashBounds(
      { latitude: 40.7128, longitude: -74.006 },
      50000
    );
    expect(large.length).toBeGreaterThanOrEqual(small.length);
  });
});

describe("distanceMeters", () => {
  it("returns 0 for the same point", () => {
    const point = { latitude: 40.7128, longitude: -74.006 };
    expect(distanceMeters(point, point)).toBe(0);
  });

  it("calculates a known distance approximately correctly", () => {
    // NYC to Philadelphia is ~130km
    const nyc = { latitude: 40.7128, longitude: -74.006 };
    const philly = { latitude: 39.9526, longitude: -75.1652 };
    const dist = distanceMeters(nyc, philly);
    expect(dist).toBeGreaterThan(120_000);
    expect(dist).toBeLessThan(140_000);
  });

  it("returns positive values regardless of order", () => {
    const a = { latitude: 40.7128, longitude: -74.006 };
    const b = { latitude: 35.6762, longitude: 139.6503 };
    expect(distanceMeters(a, b)).toBe(distanceMeters(b, a));
  });
});

describe("isWithinRadius", () => {
  const center = { latitude: 40.7128, longitude: -74.006 };

  it("returns true for the same point", () => {
    expect(isWithinRadius(center, center, 100)).toBe(true);
  });

  it("returns true for a nearby point within radius", () => {
    // ~30m away
    const nearby = { latitude: 40.7130, longitude: -74.0055 };
    expect(isWithinRadius(center, nearby, 500)).toBe(true);
  });

  it("returns false for a distant point outside radius", () => {
    const far = { latitude: 39.9526, longitude: -75.1652 }; // Philly
    expect(isWithinRadius(center, far, 1000)).toBe(false);
  });
});
