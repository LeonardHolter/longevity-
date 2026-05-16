"use client";

import React from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { WhoopData } from "../lib/useWhoop";

interface LoginProps {
  whoop: WhoopData;
}

export default function Login({ whoop }: LoginProps) {
  return (
    <div className="login-page">
      <div className="login-art">
        <div className="login-art-brand">Helix</div>

        <svg
          className="login-art-helix"
          width="540"
          height="700"
          viewBox="0 0 540 700"
          fill="none"
        >
          {Array.from({ length: 28 }).map((_, i) => {
            const y = i * 25 + 10;
            const phase = (i / 28) * Math.PI * 6;
            const x1 = 270 + Math.sin(phase) * 140;
            const x2 = 270 - Math.sin(phase) * 140;
            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke="oklch(0.78 0.10 145)"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <circle cx={x1} cy={y} r="3" fill="oklch(0.78 0.10 145)" />
                <circle cx={x2} cy={y} r="3" fill="oklch(0.92 0.04 145)" />
              </g>
            );
          })}
        </svg>

        <div className="login-art-hero">
          <div className="login-art-quote">
            The body keeps <em>perfect record</em> of what we do to it.
            <br />
            Read it. Edit it. Extend it.
          </div>
          <div className="login-art-attribution">
            Helix &middot; Ultimate Longevity Protocol
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-eyebrow">Welcome back</div>
        <h1 className="login-title">
          Sign in to <em>continue</em>
        </h1>
        <p className="login-sub">
          {whoop.connected
            ? `WHOOP connected as ${whoop.profile?.first_name ?? "user"}. Sign in to view your dashboard.`
            : "Connect your WHOOP to pull live recovery, sleep, and strain data into your protocol."}
        </p>

        <div className="login-form" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SignInButton mode="modal">
            <button className="login-btn" type="button">
              Sign in
              <span className="login-arrow">→</span>
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="login-btn" type="button" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
              Create account
              <span className="login-arrow">→</span>
            </button>
          </SignUpButton>
        </div>

        <div className="connect-row">
          <div className="connect-label">Connected services</div>
          <div className="connect-list">
            {whoop.connected ? (
              <div className="connect-btn">
                <div className="connect-glyph">W</div>
                <span>WHOOP</span>
                <span className="connect-status">● ACTIVE</span>
              </div>
            ) : (
              <button
                className="connect-btn"
                onClick={whoop.connect}
                style={{ cursor: "pointer", border: "none", background: "none" }}
              >
                <div className="connect-glyph">W</div>
                <span>WHOOP</span>
                <span className="connect-status" style={{ color: "var(--warm)" }}>
                  CONNECT →
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
