"use client";

import React from "react";
import { DailyChecklistPanel } from "./DailyChecklist";
import { useWhoopContext } from "../lib/useWhoop";

export default function Today({ onNavigate }: { onNavigate: (route: string) => void }) {
  const whoop = useWhoopContext();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{today}</div>
          <h1 className="page-title">
            <em>Today</em>
          </h1>
          <p className="page-sub">
            Your daily protocol. Tick everything off before the day ends.
          </p>
        </div>
      </div>

      <div className="page-body">
        <DailyChecklistPanel onNavigate={onNavigate} />

        {/* WHOOP connection button — visible on mobile where sidebar is hidden */}
        {!whoop.connected && (
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={whoop.connect}
              className="card"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                cursor: "pointer",
                border: "1px solid var(--hairline-2)",
                background: "var(--surface)",
                transition: "border-color 0.1s",
              }}
            >
              <span style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--ink)",
                color: "var(--surface)",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--mono)",
                fontSize: 10,
                fontWeight: 600,
                flexShrink: 0,
              }}>W</span>
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14 }}>Connect WHOOP</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Sync recovery &amp; strain</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
