import { useState, useEffect, useRef } from "react";
import { autocompletePlaces, type HerePlaceResult } from "@/services/herePlaces";
import { SEARCH_DEBOUNCE_MS } from "@/constants/config";
import type { LatLng } from "@/utils/geo";

export function usePlaceSearch(location: LatLng | null) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HerePlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        setError(null);
        const items = await autocompletePlaces(query, location ?? undefined);
        setResults(items);
      } catch (e: any) {
        setError(e.message ?? "Search failed");
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [query, location]);

  return { query, setQuery, results, isSearching, error };
}
