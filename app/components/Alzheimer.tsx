"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUserData } from "../lib/useUserData";

type Op = "+" | "−" | "×" | "÷";

const OPERATIONS: Op[] = ["+", "−", "×", "÷"];
const GAME_DURATION = 120; // 2 minutes

interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
}

function generateProblem(): Problem {
  const op = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 100) + 2;
      b = Math.floor(Math.random() * 100) + 2;
      answer = a + b;
      break;
    case "−":
      a = Math.floor(Math.random() * 100) + 2;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      answer = a * b;
      break;
    case "÷":
      b = Math.floor(Math.random() * 12) + 2;
      answer = Math.floor(Math.random() * 12) + 2;
      a = b * answer;
      break;
    default:
      a = 0; b = 0; answer = 0;
  }

  return { a, b, op, answer };
}

export default function Alzheimer() {
  const [state, setState] = useState<"idle" | "playing" | "done">("idle");
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState<Problem>(generateProblem);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ correct: boolean; time: number }[]>([]);
  const [bestScore, setBestScore] = useUserData<number | null>("zetamacBest", null);
  const [gameHistory, setGameHistory] = useUserData<{ date: string; score: number }[]>("zetamacHistory", []);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);
  const problemTimeRef = useRef<number>(0);

  const nextProblem = useCallback(() => {
    setProblem(generateProblem());
    setInput("");
    problemTimeRef.current = Date.now();
  }, []);

  const startGame = useCallback(() => {
    setState("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setHistory([]);
    startTimeRef.current = Date.now();
    problemTimeRef.current = Date.now();
    nextProblem();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [nextProblem]);

  useEffect(() => {
    if (state !== "playing") return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = GAME_DURATION - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        setState("done");
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (state === "done") {
      if (bestScore === null || score > bestScore) {
        setBestScore(score);
      }
      // Save to game history
      const today = new Date().toISOString().slice(0, 10);
      setGameHistory([...gameHistory, { date: today, score }]);
      // Sync to server for compete
      const avg = history.length
        ? Math.round(history.reduce((s, h) => s + h.time, 0) / history.length)
        : 0;
      fetch("/api/stats/zetamac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, avgTime: avg }),
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, score, bestScore, history]);

  const handleInput = (val: string) => {
    // Allow negative sign and digits
    if (val !== "" && val !== "-" && isNaN(Number(val))) return;
    setInput(val);

    if (val !== "" && val !== "-" && parseInt(val) === problem.answer) {
      const reactionTime = Date.now() - problemTimeRef.current;
      setScore((s) => s + 1);
      setHistory((h) => [...h, { correct: true, time: reactionTime }]);
      nextProblem();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && state === "idle") {
      startGame();
    }
    if (e.key === "Enter" && state === "done") {
      startGame();
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const avgTime = history.length
    ? Math.round(history.reduce((s, h) => s + h.time, 0) / history.length)
    : 0;

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const pct = ((GAME_DURATION - timeLeft) / GAME_DURATION) * 100;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{today}</div>
          <h1 className="page-title">
            Alzheimer <em>prevention</em>
          </h1>
          <p className="page-sub">
            Mental arithmetic speed drill. 2 minutes. Addition, subtraction, multiplication, division. Keep your brain sharp.
          </p>
        </div>
        <div className="page-chips">
          {bestScore != null && (
            <span className="chip">Best: {bestScore}</span>
          )}
          <span className="chip">2:00</span>
        </div>
      </div>

      <div className="page-body">
        {state === "idle" && (
          <div className="hero" style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--serif)",
              fontSize: 28,
              marginBottom: 12,
            }}>
              Ready to train?
            </div>
            <p style={{ color: "var(--muted)", maxWidth: 420, margin: "0 auto 28px", lineHeight: 1.6 }}>
              Solve as many arithmetic problems as you can in 2 minutes.
              Standard settings: +, −, ×, ÷ with numbers 2–100.
            </p>
            <button
              className="login-btn"
              onClick={startGame}
              style={{ width: "auto", padding: "14px 48px", margin: "0 auto" }}
            >
              Start
              <span className="login-arrow">→</span>
            </button>
          </div>
        )}

        {state === "playing" && (
          <>
            {/* Timer bar */}
            <div style={{
              height: 4,
              background: "var(--surface-2)",
              borderRadius: 100,
              overflow: "hidden",
              marginBottom: 8,
            }}>
              <div style={{
                width: `${100 - pct}%`,
                height: "100%",
                background: timeLeft < 30 ? "var(--danger)" : timeLeft < 60 ? "var(--warm)" : "var(--accent)",
                transition: "width 0.3s, background 0.5s",
              }} />
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 32,
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "var(--muted)",
            }}>
              <span>Score: {score}</span>
              <span style={{ color: timeLeft < 30 ? "var(--danger)" : "var(--muted)" }}>
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="hero" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: 72,
                letterSpacing: "-0.03em",
                marginBottom: 32,
              }}>
                {problem.a}
                <span style={{ color: "var(--accent)", margin: "0 16px" }}>{problem.op}</span>
                {problem.b}
              </div>

              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 48,
                  textAlign: "center",
                  background: "var(--surface-2)",
                  border: "2px solid var(--hairline)",
                  borderRadius: 12,
                  padding: "12px 24px",
                  width: 200,
                  outline: "none",
                  color: "var(--ink)",
                  caretColor: "var(--accent)",
                }}
                placeholder="?"
              />

              <div style={{
                marginTop: 24,
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--muted)",
              }}>
                {score > 0 && `${score} correct · avg ${avgTime}ms`}
              </div>
            </div>
          </>
        )}

        {state === "done" && (
          <>
            <div className="hero" style={{ textAlign: "center" }}>
              <div className="hero-eyebrow">Time&apos;s up</div>
              <div className="hero-big" style={{ color: "var(--accent)" }}>
                {score}
                <span style={{
                  fontFamily: "var(--mono)",
                  fontSize: 28,
                  color: "var(--muted)",
                  letterSpacing: 0,
                  marginLeft: 8,
                }}>
                  correct
                </span>
              </div>
              <p className="hero-bio" style={{ maxWidth: 400, margin: "12px auto 0" }}>
                {score >= 40 ? "Excellent — elite mental math." :
                 score >= 30 ? "Strong performance. Keep pushing." :
                 score >= 20 ? "Good work. Consistency is key." :
                 "Keep training daily. Your brain will thank you."}
              </p>
            </div>

            <div className="divider-label">Session stats</div>
            <div className="dash-grid">
              <div className="kpi span-4">
                <div className="kpi-head">
                  <div className="kpi-label">Score</div>
                </div>
                <div className="kpi-value">
                  {score}
                  <span className="unit">/ 2 min</span>
                </div>
                <div className="kpi-foot">
                  <span>{(score / 2).toFixed(1)}/min</span>
                  <span>{bestScore != null && score >= bestScore ? "🏆 New best!" : `Best: ${bestScore ?? "—"}`}</span>
                </div>
              </div>

              <div className="kpi span-4">
                <div className="kpi-head">
                  <div className="kpi-label">Avg response</div>
                </div>
                <div className="kpi-value">
                  {avgTime}
                  <span className="unit">ms</span>
                </div>
                <div className="kpi-foot">
                  <span>{avgTime < 2000 ? "Fast" : avgTime < 4000 ? "Moderate" : "Slow"}</span>
                  <span>{history.length} problems</span>
                </div>
              </div>

              <div className="kpi span-4">
                <div className="kpi-head">
                  <div className="kpi-label">Personal best</div>
                </div>
                <div className="kpi-value">
                  {bestScore ?? "—"}
                </div>
                <div className="kpi-foot">
                  <span>All time</span>
                  <span>Local record</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button
                className="login-btn"
                onClick={startGame}
                style={{ width: "auto", padding: "14px 48px", margin: "0 auto" }}
              >
                Play again
                <span className="login-arrow">→</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
