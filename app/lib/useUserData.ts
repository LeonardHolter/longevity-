"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";

// ── Module-level shared state ──────────────────────────────────────────────
// All useUserData instances for the same key share a single in-memory cache.
// This prevents the bug where a second component mounts, fetches stale API
// data, and overwrites correct localStorage (e.g. DailyChecklist mounting
// useUserData("foodLogs") and clobbering data the Food page just wrote).

interface CacheEntry {
  value: unknown;
  /** Timestamp of last local write. 0 = never written locally this session. */
  writtenAt: number;
}

const cache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();

function getEntry(key: string): CacheEntry | undefined {
  return cache.get(key);
}

function setEntry(key: string, value: unknown, writtenAt: number) {
  cache.set(key, { value, writtenAt });
  // Notify every hook instance subscribed to this key
  const subs = listeners.get(key);
  if (subs) subs.forEach((cb) => cb());
}

function subscribe(key: string, cb: () => void): () => void {
  let subs = listeners.get(key);
  if (!subs) {
    subs = new Set();
    listeners.set(key, subs);
  }
  subs.add(cb);
  return () => {
    subs!.delete(cb);
    if (subs!.size === 0) listeners.delete(key);
  };
}

// Track which keys have an in-flight API fetch to avoid duplicates
const fetchingKeys = new Set<string>();

/**
 * Hook that syncs a single key from the user's profile (Clerk privateMetadata).
 * Falls back to localStorage when offline / loading.
 * Debounces saves so rapid changes don't spam the API.
 *
 * Multiple components can use the same key — they share an in-memory cache
 * so writes from one instance are immediately visible to all others, and
 * stale API fetches never overwrite local data.
 */
export function useUserData<T>(key: string, fallback: T): [T, (value: T) => void, boolean] {
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValue = useRef<T>(fallback);
  const fallbackRef = useRef(fallback);

  // ── Shared cache subscription via useSyncExternalStore ──
  const subscribeFn = useCallback((cb: () => void) => subscribe(key, cb), [key]);
  const getSnapshot = useCallback(() => getEntry(key), [key]);

  const cacheEntry = useSyncExternalStore(subscribeFn, getSnapshot, getSnapshot);

  // Derive current value: cache → localStorage → fallback
  const data: T = cacheEntry
    ? (cacheEntry.value as T)
    : fallbackRef.current;

  // Keep latestValue in sync
  latestValue.current = data;

  // ── Bootstrap: load localStorage + API fetch (once per key globally) ──
  useEffect(() => {
    // If the cache already has a value for this key, skip bootstrap entirely
    const existing = getEntry(key);
    if (existing) {
      setLoaded(true);
      return;
    }

    // Load localStorage for fast first render
    try {
      const local = localStorage.getItem(`helix-${key}`);
      if (local) {
        const parsed = JSON.parse(local) as T;
        // writtenAt = 0 means "loaded from localStorage, not a fresh user write"
        setEntry(key, parsed, 0);
      }
    } catch {
      // ignore
    }

    // Deduplicate API fetches — if another instance is already fetching, skip
    if (fetchingKeys.has(key)) {
      setLoaded(true);
      return;
    }
    fetchingKeys.add(key);

    fetch(`/api/user/data?keys=${key}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        const entry = getEntry(key);

        // If any local WRITE happened (writtenAt > 0), the cache is more
        // recent than whatever the server has — don't overwrite.
        if (entry && entry.writtenAt > 0) {
          setLoaded(true);
          return;
        }

        const remote = res[key];
        if (remote !== null && remote !== undefined) {
          // Also check the localStorage timestamp as a secondary guard
          const lastWrite = parseInt(localStorage.getItem(`helix-${key}-t`) || "0");
          if (Date.now() - lastWrite < 10000) {
            setLoaded(true);
            return;
          }
          // Server data is source of truth for initial load
          setEntry(key, remote, 0);
          localStorage.setItem(`helix-${key}`, JSON.stringify(remote));
        } else {
          // Server has no data — push localStorage to server if we have any
          const local = localStorage.getItem(`helix-${key}`);
          if (local) {
            const parsed = JSON.parse(local);
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
        setLoaded(true);
      })
      .finally(() => {
        fetchingKeys.delete(key);
      });
  }, [key]);

  // ── Save to both cache + localStorage + API (debounced) ──
  const update = useCallback(
    (value: T) => {
      latestValue.current = value;

      // Update shared cache — all subscribers instantly re-render
      setEntry(key, value, Date.now());

      // Persist locally immediately
      localStorage.setItem(`helix-${key}`, JSON.stringify(value));
      localStorage.setItem(`helix-${key}-t`, String(Date.now()));

      // Debounce API call (500ms)
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch("/api/user/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: latestValue.current }),
        }).catch(() => {
          // Offline — data is in localStorage + cache, will sync next load
        });
      }, 500);
    },
    [key]
  );

  // ── Flush pending save on unmount ──
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        const val = latestValue.current;
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
