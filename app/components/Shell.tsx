"use client";

import React from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useWhoopContext } from "../lib/useWhoop";

interface ShellProps {
  route: string;
  setRoute: (route: string) => void;
  children: React.ReactNode;
}

const items = [
  { id: "compete", label: "Compete", short: "Compete", num: "01" },
  { id: "dashboard", label: "Healthspan", short: "Health", num: "02" },
  { id: "alzheimer", label: "Alzheimer prevention", short: "Brain", num: "03" },
  { id: "strength", label: "Strength", short: "Lift", num: "04" },
  { id: "weight", label: "Weight", short: "Weight", num: "05" },
  { id: "food", label: "Food log", short: "Food", num: "06" },
];

export default function Shell({ route, setRoute, children }: ShellProps) {
  const whoop = useWhoopContext();
  const { user } = useUser();


  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : whoop.profile
      ? `${whoop.profile.first_name[0]}${whoop.profile.last_name[0]}`
      : "LH";

  const displayName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User"
    : whoop.profile
      ? `${whoop.profile.first_name} ${whoop.profile.last_name}`
      : "Leonard Holter";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Helix</div>
          <div className="brand-tag">v0.4</div>
        </div>

        <nav className="nav">
          <div className="nav-section">Protocol</div>
          {items.map((it) => (
            <button
              key={it.id}
              className={"nav-item" + (route === it.id ? " active" : "")}
              onClick={() => setRoute(it.id)}
            >
              <span className="nav-label-full">{it.label}</span>
              <span className="nav-label-short">{it.short}</span>
              <span className="num">{it.num}</span>
            </button>
          ))}
          <div className="nav-section">Connected</div>
          {whoop.connected ? (
            <div className="nav-item nav-whoop" style={{ pointerEvents: "none" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent)",
                }}
              />
              WHOOP
              <span className="num" style={{ fontSize: 9 }}>
                SYNCED
              </span>
            </div>
          ) : (
            <button
              className="nav-item nav-whoop"
              onClick={whoop.connect}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--faint)",
                }}
              />
              WHOOP
              <span className="num" style={{ fontSize: 9 }}>
                CONNECT
              </span>
            </button>
          )}
        </nav>

        <div className="account">
          {user ? (
            <UserButton
              appearance={{
                elements: { avatarBox: { width: 36, height: 36 } },
              }}
            />
          ) : (
            <div className="avatar">{initials}</div>
          )}
          <div className="account-meta">
            <div className="account-name">{displayName}</div>
            <div className="account-sync">
              <span className="sync-dot"></span>
              {whoop.connected ? "WHOOP synced" : "No devices connected"}
            </div>
          </div>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
