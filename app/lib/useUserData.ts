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
  const hasFetched = useRef(false);

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

    // Then fetch from API — server is source of truth
    fetch(`/api/user/data?keys=${key}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        hasFetched.current = true;
        const remote = res[key];
        if (remote !== null && remote !== undefined) {
          // Server has data — use it as source of truth
          setData(remote as T);
          latestValue.current = remote as T;
          localStorage.setItem(`helix-${key}`, JSON.stringify(remote));
        } else {
          // Server has no data — push localStorage to server if we have any
          const local = localStorage.getItem(`helix-${key}`);
          if (local) {
            const parsed = JSON.parse(local);
            // Push local data to server so it syncs across devices
            fetch("/api/user/data", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key, value: parsed }),
            }).catch(() => {});
          }
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

  // Flush pending save on unmount so data isn't lost
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        // Fire immediately on unmount
        const val = latestValue.current;
        // Use sendBeacon for reliability on page close
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/user/data",
            new Blob(
              [JSON.stringify({ key, value: val })],
              { type: "application/json" }
            )
          );
        } else {
          fetch("/api/user/data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value: val }),
            keepalive: true,
          }).catch(() => {});
        }
      }
    };
  }, [key]);

  return [data, update, loaded];
}
