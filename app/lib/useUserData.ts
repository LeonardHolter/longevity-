"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook that syncs a single key from the user's profile (Clerk privateMetadata).
 * Falls back to localStorage when offline / loading.
 * Debounces saves so rapid changes don't spam the API.
 */
export function useUserData<T>(key: string, fallback: T): [T, (value: T) => void, boolean] {
  const [data, setData] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValue = useRef<T>(fallback);

  // Load from API on mount, fall back to localStorage
  useEffect(() => {
    // Immediately load from localStorage for fast render
    try {
      const local = localStorage.getItem(`helix-${key}`);
      if (local) {
        const parsed = JSON.parse(local) as T;
        setData(parsed);
        latestValue.current = parsed;
      }
    } catch {
      // ignore
    }

    // Then fetch from API
    fetch(`/api/user/data?keys=${key}`)
      .then((r) => r.json())
      .then((res) => {
        const remote = res[key];
        if (remote != null) {
          setData(remote as T);
          latestValue.current = remote as T;
          // Update localStorage with server truth
          localStorage.setItem(`helix-${key}`, JSON.stringify(remote));
        }
        setLoaded(true);
      })
      .catch(() => {
        // Offline — localStorage is already loaded
        setLoaded(true);
      });
  }, [key]);

  // Save to both localStorage and API (debounced)
  const update = useCallback(
    (value: T) => {
      setData(value);
      latestValue.current = value;

      // Persist locally immediately
      localStorage.setItem(`helix-${key}`, JSON.stringify(value));

      // Debounce API call (500ms)
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch("/api/user/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: latestValue.current }),
        }).catch(() => {
          // Offline — data is in localStorage, will sync next load
        });
      }, 500);
    },
    [key]
  );

  return [data, update, loaded];
}
