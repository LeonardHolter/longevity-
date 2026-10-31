"use client";

import React, { useCallback, useRef, useState } from "react";
import { useUserData } from "../lib/useUserData";

interface JournalEntry {
  bottleneck: string;
  action: string;
}

// trainingJournal shape: { "2026-10-31": { bottleneck: "...", action: "..." } }
type JournalLogs = Record<string, JournalEntry>;

const EMPTY_JOURNAL: JournalEntry = { bottleneck: "", action: "" };

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return localDateStr(new Date());
}

function hasContent(entry: JournalEntry | undefined): boolean {
  return !!entry && (entry.bottleneck.trim() !== "" || entry.action.trim() !== "");
}

export default function Journal() {
  const [logs, setLogs, loaded] = useUserData<JournalLogs>("trainingJournal", {});
  const logsRef = useRef(logs);
  logsRef.current = logs;

  const [selectedDate, setSelectedDate] = useState(todayKey());

  const entry = logs[selectedDate] ?? EMPTY_JOURNAL;

  const handleUpdate = useCallback(
    (field: "bottleneck" | "action", value: string) => {
      const current = logsRef.current;
      const existing = current[selectedDate] ?? EMPTY_JOURNAL;
      const newLogs = { ...current, [selectedDate]: { ...existing, [field]: value } };
      logsRef.current = newLogs;
      setLogs(newLogs);
    },
    [setLogs, selectedDate]
  );

  // Last 14 days for the day strip
  const days: Date[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const history = Object.entries(logs)
    .filter(([date, e]) => date !== selectedDate && hasContent(e))
    .sort(([a], [b]) => b.localeCompare(a));

  if (!loaded) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 400,
        fontFamily: "var(--serif)",
        fontSize: 18,
        color: "var(--muted)",
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            Holding Athlete · reflection
          </div>
          <h1 className="page-title">
            Training <em>journal</em>
          </h1>
        </div>
      </div>

      <div className="page-body">
        {/* Day strip */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 24, overflowX: "auto",
        }}>
          {days.map((d) => {
            const key = localDateStr(d);
            const isSelected = key === selectedDate;
            const filled = hasContent(logs[key]);

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: isSelected ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                  background: isSelected ? "var(--surface-2)" : "transparent",
                  cursor: "pointer",
                  minWidth: 52,
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: "var(--muted)",
                }}>
                  {d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                </div>
                <div style={{
                  fontFamily: "var(--serif)",
                  fontSize: 18,
                  color: "var(--ink)",
                }}>
                  {d.getDate()}
                </div>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: filled ? "var(--accent)" : "transparent",
                  border: !filled ? "1px solid var(--hairline)" : "none",
                }} />
              </button>
            );
          })}
        </div>

        <div className="session-shell">
          <div className="session-head">
            <div>
              <div className="session-eyebrow">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </div>
            </div>
          </div>

          <div className="journal-grid">
            <div className="card journal-card">
              <div className="card-title">Current bottleneck</div>
              <textarea
                className="journal-textarea"
                value={entry.bottleneck}
                onChange={(e) => handleUpdate("bottleneck", e.target.value)}
                placeholder="What's holding your training back right now?"
                rows={4}
              />
            </div>
            <div className="card journal-card">
              <div className="card-title">What I've done about it</div>
              <textarea
                className="journal-textarea"
                value={entry.action}
                onChange={(e) => handleUpdate("action", e.target.value)}
                placeholder="What did you try or change?"
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <>
            <div className="divider-label">Past entries</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map(([date, e]) => (
                <div
                  key={date}
                  className="card"
                  style={{ padding: 20, cursor: "pointer" }}
                  onClick={() => setSelectedDate(date)}
                >
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15, marginBottom: 12 }}>
                    {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--faint)", marginBottom: 4 }}>
                        BOTTLENECK
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: e.bottleneck ? "var(--ink)" : "var(--faint)", whiteSpace: "pre-wrap" }}>
                        {e.bottleneck || "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--faint)", marginBottom: 4 }}>
                        WHAT I DID
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: e.action ? "var(--ink)" : "var(--faint)", whiteSpace: "pre-wrap" }}>
                        {e.action || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {history.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: "center", marginTop: 20 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginBottom: 12 }}>
              No past entries yet
            </div>
            <p style={{ color: "var(--muted)", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
              Fill out today's boxes above. Once you log entries across a few
              days, they'll show up here so you can see what's been sticking
              around.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
