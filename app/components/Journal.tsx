"use client";

import React, { useCallback, useRef, useState } from "react";
import { useUserData } from "../lib/useUserData";
import { WEEK_DAYS } from "./Strength";

interface JournalEntry {
  bottleneck: string;
  action: string;
}

// trainingJournal shape: { "2026-10-31": { "mon": { bottleneck: "...", action: "..." } } }
type JournalLogs = Record<string, Record<string, JournalEntry>>;

const EMPTY_JOURNAL: JournalEntry = { bottleneck: "", action: "" };

function isoToday(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function dayMeta(dayId: string) {
  return WEEK_DAYS.find((d) => d.id === dayId);
}

function getJournalHistory(logs: JournalLogs): { date: string; dayId: string; entry: JournalEntry }[] {
  const history: { date: string; dayId: string; entry: JournalEntry }[] = [];
  for (const date of Object.keys(logs)) {
    for (const dayId of Object.keys(logs[date])) {
      const entry = logs[date][dayId];
      if (entry.bottleneck.trim() || entry.action.trim()) {
        history.push({ date, dayId, entry });
      }
    }
  }
  return history.sort((a, b) => b.date.localeCompare(a.date));
}

export default function Journal() {
  const dayIds = WEEK_DAYS.map((d) => d.id);
  const todayIdx = new Date().getDay();
  // Map JS day (0=Sun) to our array (0=Mon)
  const mappedIdx = todayIdx === 0 ? 6 : todayIdx - 1;
  const [activeDay, setActiveDay] = useState(dayIds[mappedIdx] || "mon");

  const today = isoToday();
  const [logs, setLogs, loaded] = useUserData<JournalLogs>("trainingJournal", {});

  // Keep a ref that always has the latest logs so callbacks never read stale state
  const logsRef = useRef(logs);
  logsRef.current = logs;

  const entry = logs[today]?.[activeDay] ?? EMPTY_JOURNAL;

  const handleUpdate = useCallback(
    (field: "bottleneck" | "action", value: string) => {
      const current = logsRef.current;
      const newLogs = { ...current };
      if (!newLogs[today]) newLogs[today] = {};
      const existing = newLogs[today][activeDay] ?? EMPTY_JOURNAL;
      newLogs[today][activeDay] = { ...existing, [field]: value };
      logsRef.current = newLogs;
      setLogs(newLogs);
    },
    [setLogs, today, activeDay]
  );

  const history = getJournalHistory(logs).filter(
    (h) => !(h.date === today && h.dayId === activeDay)
  );

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
            Training · reflection
          </div>
          <h1 className="page-title">
            Session <em>journal</em>
          </h1>
          <p className="page-sub">
            Every session, name the one thing holding it back and what you've
            done about it. Pick a day below to log today's entry.
          </p>
        </div>
      </div>

      <div className="page-body">
        {/* Day selector */}
        <div style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          overflowX: "auto",
        }}>
          {WEEK_DAYS.map((d) => (
            <button
              key={d.id}
              className={`session-switch-btn${d.id === activeDay ? " active" : ""}`}
              onClick={() => setActiveDay(d.id)}
              style={{ padding: "8px 14px", fontSize: 11, whiteSpace: "nowrap" }}
            >
              <span style={{ fontWeight: 600 }}>{d.label.slice(0, 3)}</span>
              <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 10 }}>{d.tag}</span>
            </button>
          ))}
        </div>

        <div className="session-shell">
          <div className="session-head">
            <div>
              <div className="session-eyebrow">{dayMeta(activeDay)?.label}</div>
              <div className="session-title">
                <span className="session-day-tag">{dayMeta(activeDay)?.tag}</span>
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
                placeholder="What's holding this session back?"
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
              {history.map((h) => (
                <div key={`${h.date}-${h.dayId}`} className="card" style={{ padding: 20 }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 12,
                  }}>
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15 }}>
                      {new Date(h.date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div style={{
                      fontFamily: "var(--mono)", fontSize: 10,
                      letterSpacing: "0.1em", color: "var(--accent)",
                    }}>
                      {dayMeta(h.dayId)?.tag}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--faint)", marginBottom: 4 }}>
                        BOTTLENECK
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: h.entry.bottleneck ? "var(--ink)" : "var(--faint)", whiteSpace: "pre-wrap" }}>
                        {h.entry.bottleneck || "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--faint)", marginBottom: 4 }}>
                        WHAT I DID
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: h.entry.action ? "var(--ink)" : "var(--faint)", whiteSpace: "pre-wrap" }}>
                        {h.entry.action || "—"}
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
              sessions, they'll show up here so you can see what's been
              sticking around.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
