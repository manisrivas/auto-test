"use client";

import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from "recharts";

interface TrendChartProps {
  history: { date: string; percent: number }[];
  threshold?: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "8px 12px", fontFamily: "DM Mono, monospace", fontSize: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <p style={{ color: "#8a8a8a", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#0a0a0a", fontWeight: 500 }}>{payload[0].value}%</p>
    </div>
  );
}

export default function TrendChart({ history, threshold = 80 }: TrendChartProps) {
  if (history.length === 0) {
    return (
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "48px 20px", textAlign: "center", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a" }}>
        No history yet
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#0a0a0a", letterSpacing: "-0.2px" }}>Coverage — {history.length} pushes</span>
        <button style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", border: "none", background: "none", cursor: "pointer" }}>Full history →</button>
      </div>
      <div style={{ padding: 20 }}>
        <ResponsiveContainer width="100%" height={130}>
          <ComposedChart data={history} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="covGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0a0a0a" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#0a0a0a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontFamily: "DM Mono, monospace", fontSize: 9, fill: "#c4c4c4" }} axisLine={false} tickLine={false} />
            <YAxis domain={[50, 100]} tick={{ fontFamily: "DM Mono, monospace", fontSize: 9, fill: "#c4c4c4" }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={threshold} stroke="#c4c4c4" strokeDasharray="4 4" strokeWidth={1} />
            <Area type="monotone" dataKey="percent" stroke="#0a0a0a" strokeWidth={1.5} fill="url(#covGrad)" dot={false} activeDot={{ r: 3, fill: "#0a0a0a", strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a" }}>
            <div style={{ width: 18, height: 1.5, background: "#0a0a0a" }} /> Coverage
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a" }}>
            <div style={{ width: 18, height: 0, borderTop: "1px dashed #c4c4c4" }} /> Threshold
          </div>
        </div>
      </div>
    </div>
  );
}
