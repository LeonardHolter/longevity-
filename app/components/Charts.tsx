"use client";

import React from "react";

interface Series {
  values: (number | null)[];
  color: string;
  width?: number;
  dashed?: boolean;
  fill?: boolean;
  dots?: boolean;
  dotR?: number;
  endLabel?: boolean;
}

interface LineChartProps {
  series: Series[];
  width?: number;
  height?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  yDomain?: [number, number];
  yTicks?: number;
  xLabels?: string[];
  yUnit?: string;
  showProjection?: boolean;
  projectionStartIdx?: number;
}

export function LineChart({
  series,
  width = 800,
  height = 280,
  padding = { top: 24, right: 24, bottom: 36, left: 48 },
  yDomain,
  yTicks = 4,
  xLabels,
  yUnit = "",
  showProjection = false,
  projectionStartIdx,
}: LineChartProps) {
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allVals = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const [yMin, yMax] = yDomain || [
    Math.floor(Math.min(...allVals) - 1),
    Math.ceil(Math.max(...allVals) + 1),
  ];
  const n = Math.max(...series.map((s) => s.values.length));

  const xPos = (i: number) => padding.left + (i / (n - 1)) * innerW;
  const yPos = (v: number) => padding.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const ticks: number[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const v = yMin + ((yMax - yMin) * i) / yTicks;
    ticks.push(v);
  }

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        {series.map((s, si) => (
          <linearGradient
            key={si}
            id={`grad-${si}-${s.color.replace(/[^a-z0-9]/gi, "")}`}
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>

      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={yPos(t)}
            y2={yPos(t)}
            stroke="var(--hairline)"
            strokeDasharray={i === 0 || i === ticks.length - 1 ? "" : "2 4"}
          />
          <text
            x={padding.left - 10}
            y={yPos(t) + 4}
            fontSize="10"
            fill="var(--muted)"
            fontFamily="var(--mono)"
            textAnchor="end"
          >
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </text>
        </g>
      ))}

      {yUnit && (
        <text
          x={padding.left - 38}
          y={padding.top - 8}
          fontSize="9"
          fill="var(--faint)"
          fontFamily="var(--mono)"
          letterSpacing="0.1em"
        >
          {yUnit}
        </text>
      )}

      {showProjection && projectionStartIdx != null && (
        <rect
          x={xPos(projectionStartIdx)}
          y={padding.top}
          width={width - padding.right - xPos(projectionStartIdx)}
          height={innerH}
          fill="var(--accent-soft)"
          opacity={0.4}
        />
      )}

      {series.map((s, si) => {
        const points: string[] = [];
        let firstIdx: number | null = null;
        let lastIdx: number | null = null;

        s.values.forEach((v, i) => {
          if (v != null) {
            points.push(`${firstIdx === null ? "M" : "L"} ${xPos(i)} ${yPos(v)}`);
            if (firstIdx === null) firstIdx = i;
            lastIdx = i;
          }
        });

        const path = points.join(" ");
        const areaPath =
          s.fill && lastIdx !== null && firstIdx !== null
            ? `${path} L ${xPos(lastIdx)} ${yPos(yMin)} L ${xPos(firstIdx)} ${yPos(yMin)} Z`
            : null;

        return (
          <g key={si}>
            {areaPath && (
              <path
                d={areaPath}
                fill={`url(#grad-${si}-${s.color.replace(/[^a-z0-9]/gi, "")})`}
              />
            )}
            <path
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width || 1.75}
              strokeDasharray={s.dashed ? "4 4" : ""}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.dots &&
              s.values.map((v, i) =>
                v == null ? null : (
                  <circle key={i} cx={xPos(i)} cy={yPos(v)} r={s.dotR || 2.5} fill={s.color} />
                )
              )}
            {s.endLabel &&
              (() => {
                const lastI = s.values.length - 1;
                const lastV = s.values[lastI];
                if (lastV == null) return null;
                return (
                  <g>
                    <circle cx={xPos(lastI)} cy={yPos(lastV)} r="4" fill={s.color} />
                    <circle cx={xPos(lastI)} cy={yPos(lastV)} r="8" fill={s.color} opacity="0.15" />
                  </g>
                );
              })()}
          </g>
        );
      })}

      {xLabels &&
        xLabels.map((lbl, i) => (
          <text
            key={i}
            x={xPos(i)}
            y={height - padding.bottom + 18}
            fontSize="10"
            fill="var(--muted)"
            fontFamily="var(--mono)"
            textAnchor="middle"
            letterSpacing="0.06em"
          >
            {lbl}
          </text>
        ))}
    </svg>
  );
}

interface SparklineProps {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function Sparkline({ values, color = "var(--accent)", height = 36, width = 120 }: SparklineProps) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const n = values.length;
  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (n - 1)) * width} ${height - ((v - min) / range) * height}`)
    .join(" ");
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `spark-grad-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface StrengthSparklineProps {
  values: number[];
  color: string;
}

export function StrengthSparkline({ values, color }: StrengthSparklineProps) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const n = values.length;
  const W = 280;
  const H = 84;
  const xPos = (i: number) => (i / (n - 1)) * W;
  const yPos = (v: number) => H - ((v - min) / range) * (H - 8) - 4;
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(v)}`).join(" ");
  const area = `${path} L ${W} ${H} L 0 ${H} Z`;
  const gradId = `sgrad-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} stroke={color} strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xPos(n - 1)} cy={yPos(values[n - 1])} r="6" fill={color} opacity="0.15" />
      <circle cx={xPos(n - 1)} cy={yPos(values[n - 1])} r="3" fill={color} />
    </svg>
  );
}
