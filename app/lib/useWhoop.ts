"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

export interface WhoopRecovery {
  cycle_id: number;
  score_state: string;
  score: {
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage: number | null;
    skin_temp_celsius: number | null;
  } | null;
  created_at: string;
}

export interface WhoopSleep {
  id: string;
  score_state: string;
  start: string;
  end: string;
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    respiratory_rate: number;
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    sleep_efficiency_percentage: number;
  } | null;
  created_at: string;
}

export interface WhoopCycle {
  id: number;
  score_state: string;
  start: string;
  end: string | null;
  score: {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  } | null;
  created_at: string;
}

export interface WhoopWorkout {
  id: string;
  sport_name: string;
  start: string;
  end: string;
  score: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    zone_durations: {
      zone_zero_milli: number;
      zone_one_milli: number;
      zone_two_milli: number;
      zone_three_milli: number;
      zone_four_milli: number;
      zone_five_milli: number;
    };
  } | null;
}

export interface WhoopProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface WhoopData {
  connected: boolean;
  loading: boolean;
  profile: WhoopProfile | null;
  recoveries: WhoopRecovery[];
  sleeps: WhoopSleep[];
  cycles: WhoopCycle[];
  workouts: WhoopWorkout[];
  latestRecovery: WhoopRecovery | null;
  latestSleep: WhoopSleep | null;
  connect: () => void;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

const WhoopContext = createContext<WhoopData | null>(null);
export const WhoopProvider = WhoopContext.Provider;

export function useWhoopContext(): WhoopData {
  const ctx = useContext(WhoopContext);
  if (!ctx) throw new Error("useWhoopContext must be used within WhoopProvider");
  return ctx;
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

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function useWhoop(): WhoopData {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<WhoopProfile | null>(null);
  const [recoveries, setRecoveries] = useState<WhoopRecovery[]>([]);
  const [sleeps, setSleeps] = useState<WhoopSleep[]>([]);
  const [cycles, setCycles] = useState<WhoopCycle[]>([]);
  const [workouts, setWorkouts] = useState<WhoopWorkout[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const status = await fetchJson<{ connected: boolean }>("/api/whoop/status");
    if (!status?.connected) {
      setConnected(false);
      setLoading(false);
      return;
    }

    setConnected(true);
    const start = daysAgo(30);

    const [profileData, recoveryData, sleepData, cycleData, workoutData] =
      await Promise.all([
        fetchJson<WhoopProfile>("/api/whoop/profile"),
        fetchJson<{ records: WhoopRecovery[] }>(`/api/whoop/recovery?limit=25&start=${start}`),
        fetchJson<{ records: WhoopSleep[] }>(`/api/whoop/sleep?limit=25&start=${start}`),
        fetchJson<{ records: WhoopCycle[] }>(`/api/whoop/cycle?limit=25&start=${start}`),
        fetchJson<{ records: WhoopWorkout[] }>(`/api/whoop/workout?limit=25&start=${start}`),
      ]);

    if (profileData) setProfile(profileData);
    if (recoveryData?.records) setRecoveries(recoveryData.records);
    if (sleepData?.records) setSleeps(sleepData.records);
    if (cycleData?.records) setCycles(cycleData.records);
    if (workoutData?.records) setWorkouts(workoutData.records);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const connect = useCallback(() => {
    window.location.href = "/api/whoop/auth";
  }, []);

  const disconnect = useCallback(async () => {
    await fetch("/api/whoop/disconnect", { method: "POST" });
    setConnected(false);
    setProfile(null);
    setRecoveries([]);
    setSleeps([]);
    setCycles([]);
    setWorkouts([]);
  }, []);

  const scored = recoveries.filter((r) => r.score_state === "SCORED" && r.score);
  const latestRecovery = scored[0] || null;

  const scoredSleeps = sleeps.filter((s) => s.score_state === "SCORED" && s.score);
  const latestSleep = scoredSleeps[0] || null;

  return {
    connected,
    loading,
    profile,
    recoveries,
    sleeps,
    cycles,
    workouts,
    latestRecovery,
    latestSleep,
    connect,
    disconnect,
    refresh: fetchAll,
  };
}
