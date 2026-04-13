import { formatDistance, truncate } from "../formatters";

describe("formatDistance", () => {
  it("formats meters for distances under 1km", () => {
    expect(formatDistance(50)).toBe("50m");
    expect(formatDistance(999)).toBe("999m");
  });

  it("formats kilometers for distances >= 1km", () => {
    expect(formatDistance(1000)).toBe("1.0km");
    expect(formatDistance(1500)).toBe("1.5km");
    expect(formatDistance(12345)).toBe("12.3km");
  });

  it("rounds meters to nearest integer", () => {
    expect(formatDistance(123.7)).toBe("124m");
  });
});

describe("truncate", () => {
  it("returns the string unchanged if short enough", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates with ellipsis at the limit", () => {
    const result = truncate("This is a long string", 10);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result).toContain("\u2026");
  });

  it("handles exact length", () => {
    expect(truncate("12345", 5)).toBe("12345");
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });
});
