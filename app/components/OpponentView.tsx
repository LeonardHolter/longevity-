"use client";

import React, { useState, useEffect, useCallback } from "react";

interface OpponentData {
  name: string | null;
  imageUrl: string | null;
  data: Record<string, unknown>;
}

const cache: { data: OpponentData | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 30_000; // 30s

async function fetchOpponent(keys: string[]): Promise<OpponentData | null> {
  if (cache.data && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  try {
    const res = await fetch(`/api/user/opponent?keys=${keys.join(",")}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error === "no_opponent") return null;
    cache.data = data;
    cache.ts = Date.now();
    return data;
  } catch {
    return null;
  }
}

/**
 * Small button that opens a drawer showing the opponent's data
 * for a specific metric.
 */
export function OpponentButton({
  dataKey,
  renderOpponent,
}: {
  dataKey: string;
  renderOpponent: (data: unknown, name: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [opponent, setOpponent] = useState<OpponentData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    const data = await fetchOpponent([dataKey]);
    setOpponent(data);
    setLoading(false);
  }, [dataKey]);

  return (
    <>
      <button
        onClick={load}
        className="opponent-btn"
      >
        <span className="opponent-btn-icon">👤</span>
        <span className="opponent-btn-label">Opponent</span>
      </button>

      {open && (
        <div className="opponent-overlay" onClick={() => setOpen(false)}>
          <div className="opponent-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="opponent-drawer-head">
              <div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 10,
                  letterSpacing: "0.14em", color: "var(--muted)",
                }}>
                  OPPONENT
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, marginTop: 4 }}>
                  {opponent?.name || "—"}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 20, color: "var(--muted)", padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            <div className="opponent-drawer-body">
              {loading ? (
                <div style={{
                  padding: 40, textAlign: "center",
                  fontFamily: "var(--serif)", fontSize: 16, color: "var(--muted)",
                }}>
                  Loading...
                </div>
              ) : !opponent ? (
                <div style={{
                  padding: 40, textAlign: "center",
                  fontFamily: "var(--serif)", fontSize: 16, color: "var(--muted)",
                }}>
                  No opponent found. They need to sign up first.
                </div>
              ) : (
                renderOpponent(opponent.data[dataKey], opponent.name || "Opponent")
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Preloads opponent data for multiple keys.
 */
export function useOpponentData(keys: string[]) {
  const [data, setData] = useState<OpponentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpponent(keys).then((d) => {
      setData(d);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(",")]);

  return { opponent: data, loading };
}
