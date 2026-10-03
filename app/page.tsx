"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Login from "./components/Login";
import Shell from "./components/Shell";
import Strength from "./components/Strength";
import Weight from "./components/Weight";
import { useWhoop, WhoopProvider } from "./lib/useWhoop";

function AuthenticatedApp() {
  const [route, setRoute] = useState("strength");
  const whoop = useWhoop();

  return (
    <WhoopProvider value={whoop}>
      <Shell route={route} setRoute={setRoute}>
        {route === "strength" && <Strength />}
        {route === "weight" && <Weight />}
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
