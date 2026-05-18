"use client";

import { useState, useEffect, useCallback } from "react";

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sportType: string;
  date: string;
  distance: number;       // meters
  movingTime: number;     // seconds
  elapsedTime: number;    // seconds
  avgSpeed: number;       // m/s
  maxSpeed: number;       // m/s
  avgHr: number | null;
  maxHr: number | null;
  elevation: number;
  sufferScore: number | null;
}

export interface StravaData {
  connected: boolean;
  loading: boolean;
  activities: StravaActivity[];
  connect: () => void;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function useStrava(): StravaData {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<StravaActivity[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const status = await fetchJson<{ connected: boolean }>("/api/strava/status");
    if (!status?.connected) {
      setConnected(false);
      setLoading(false);
      return;
    }

    setConnected(true);

    // Fetch last ~8 weeks of activities
    const eightWeeksAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 56;
    const data = await fetchJson<{ activities: StravaActivity[] }>(
      `/api/strava/activities?after=${eightWeeksAgo}&per_page=100`
    );

    if (data?.activities) {
      setActivities(data.activities);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const connect = useCallback(() => {
    window.location.href = "/api/strava/auth";
  }, []);

  const disconnect = useCallback(async () => {
    await fetch("/api/strava/disconnect", { method: "POST" });
    setConnected(false);
    setActivities([]);
  }, []);

  return {
    connected,
    loading,
    activities,
    connect,
    disconnect,
    refresh: fetchAll,
  };
}
