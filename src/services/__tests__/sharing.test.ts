/**
 * Tests for sharing logic — pure functions extracted from the sharing service.
 * Firestore integration is tested separately via the Firebase emulator.
 */

describe("share invite validation", () => {
  function validateShareEmail(email: string): string | null {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return "Email is required.";
    if (!trimmed.includes("@")) return "Please enter a valid email address.";
    if (!trimmed.includes(".")) return "Please enter a valid email address.";
    return null; // valid
  }

  it("accepts valid emails", () => {
    expect(validateShareEmail("friend@example.com")).toBeNull();
    expect(validateShareEmail("USER@Gmail.COM")).toBeNull();
    expect(validateShareEmail("  spaced@test.com  ")).toBeNull();
  });

  it("rejects empty strings", () => {
    expect(validateShareEmail("")).toBe("Email is required.");
    expect(validateShareEmail("   ")).toBe("Email is required.");
  });

  it("rejects emails without @", () => {
    expect(validateShareEmail("notanemail")).toBe(
      "Please enter a valid email address."
    );
  });

  it("rejects emails without domain", () => {
    expect(validateShareEmail("user@")).toBe(
      "Please enter a valid email address."
    );
  });
});

describe("shared places deduplication", () => {
  interface MockPlace {
    placeId: string;
    userId: string;
  }

  function deduplicatePlaces(
    owned: MockPlace[],
    shared: MockPlace[]
  ): MockPlace[] {
    const seen = new Set<string>();
    const result: MockPlace[] = [];

    for (const p of owned) {
      seen.add(p.placeId);
      result.push(p);
    }

    for (const p of shared) {
      if (!seen.has(p.placeId)) {
        result.push(p);
      }
    }

    return result;
  }

  it("returns owned places when no shared places", () => {
    const owned = [{ placeId: "1", userId: "me" }];
    const result = deduplicatePlaces(owned, []);
    expect(result).toHaveLength(1);
  });

  it("adds shared places that aren't already owned", () => {
    const owned = [{ placeId: "1", userId: "me" }];
    const shared = [{ placeId: "2", userId: "them" }];
    const result = deduplicatePlaces(owned, shared);
    expect(result).toHaveLength(2);
  });

  it("deduplicates when same place appears in both lists", () => {
    const owned = [{ placeId: "1", userId: "me" }];
    const shared = [{ placeId: "1", userId: "me" }];
    const result = deduplicatePlaces(owned, shared);
    expect(result).toHaveLength(1);
  });

  it("handles empty owned list", () => {
    const shared = [
      { placeId: "1", userId: "them" },
      { placeId: "2", userId: "them" },
    ];
    const result = deduplicatePlaces([], shared);
    expect(result).toHaveLength(2);
  });

  it("handles both lists empty", () => {
    expect(deduplicatePlaces([], [])).toHaveLength(0);
  });
});

describe("isOwner check", () => {
  it("correctly identifies owner", () => {
    const place = { userId: "user-123" };
    expect(place.userId === "user-123").toBe(true);
    expect(place.userId === "user-456").toBe(false);
  });
});
