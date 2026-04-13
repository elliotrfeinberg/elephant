import { autocompletePlaces, reverseGeocode } from "../herePlaces";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("autocompletePlaces", () => {
  it("returns empty array for empty query", async () => {
    const results = await autocompletePlaces("");
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty array for whitespace-only query", async () => {
    const results = await autocompletePlaces("   ");
    expect(results).toEqual([]);
  });

  it("calls HERE API and maps results correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "here:123",
            title: "Joe's Pizza",
            address: { label: "123 Main St, New York, NY" },
            position: { lat: 40.7128, lng: -74.006 },
            categories: [{ id: "100-1000", name: "Restaurant" }],
          },
          {
            id: "here:456",
            title: "Some Chain",
            address: { label: "456 Broadway, New York, NY" },
            position: { lat: 40.714, lng: -74.005 },
            categories: [],
          },
        ],
      }),
    });

    const results = await autocompletePlaces("pizza", {
      latitude: 40.7128,
      longitude: -74.006,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("autosuggest");
    expect(url).toContain("q=pizza");

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: "here:123",
      title: "Joe's Pizza",
      address: {
        label: "123 Main St, New York, NY",
        street: undefined,
        city: undefined,
        state: undefined,
        postalCode: undefined,
        countryName: undefined,
      },
      position: { lat: 40.7128, lng: -74.006 },
      categories: [{ id: "100-1000", name: "Restaurant" }],
    });
  });

  it("filters out items without position", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "here:789",
            title: "No Position Place",
            address: { label: "Somewhere" },
            // No position field
          },
          {
            id: "here:101",
            title: "Has Position",
            address: { label: "Here" },
            position: { lat: 1, lng: 2 },
          },
        ],
      }),
    });

    const results = await autocompletePlaces("test");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Has Position");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await expect(autocompletePlaces("test")).rejects.toThrow(
      "HERE API error: 401"
    );
  });
});

describe("reverseGeocode", () => {
  it("returns address label from API response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            address: { label: "123 Main St, New York, NY 10001, USA" },
          },
        ],
      }),
    });

    const result = await reverseGeocode({ latitude: 40.7128, longitude: -74.006 });
    expect(result).toBe("123 Main St, New York, NY 10001, USA");
  });

  it("returns fallback string when no results", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const result = await reverseGeocode({ latitude: 0, longitude: 0 });
    expect(result).toBe("Unknown location");
  });
});
