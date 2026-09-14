"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Login from "./components/Login";
import Shell from "./components/Shell";
import Dashboard from "./components/Dashboard";
import Strength from "./components/Strength";
import Weight from "./components/Weight";
import Food from "./components/Food";
import Today from "./components/Today";
import Alzheimer from "./components/Alzheimer";
import { useWhoop, WhoopProvider } from "./lib/useWhoop";

function AuthenticatedApp() {
  const [route, setRoute] = useState("today");
  const whoop = useWhoop();

  return (
    <WhoopProvider value={whoop}>
      <Shell route={route} setRoute={setRoute}>
        {route === "dashboard" && <Dashboard />}
        {route === "strength" && <Strength />}
        {route === "weight" && <Weight />}
        {route === "food" && <Food />}
        {route === "today" && <Today onNavigate={setRoute} />}
        {route === "alzheimer" && <Alzheimer />}
      </Shell>
    </WhoopProvider>
  );
}

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const whoop = useWhoop();

  if (!isLoaded) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "var(--serif)",
        fontSize: 18,
        color: "var(--muted)",
      }}>
        Loading…
      </div>
    );
  }

  if (!isSignedIn) {
    return <Login whoop={whoop} />;
  }

  return <AuthenticatedApp />;
}
