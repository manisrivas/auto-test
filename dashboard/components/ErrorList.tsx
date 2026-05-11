"use client";

import { useState } from "react";

interface FailedFunction {
  name: string;
  file: string;
  tests_generated: number;
  tests_passed: number;
  failure_output: string;
}

interface Push {
  id: string;
  developer: string;
  branch: string;
  commit: string;
  timestamp: string;
  status: string;
  coverage_percent: number;
  failed_functions: FailedFunction[];
}

interface ErrorListProps {
  pushes: Push[];
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const iconStyle = (status: string) =>
  ({
    pass: { background: "#edf7f1", color: "#2ea865" },
    fail: { background: "#fdf0ee", color: "#c0392b" },
    warn: { background: "#fef8ee", color: "#b45309" },
  }[status === "passed" ? "pass" : status === "failed" ? "fail" : "warn"] ?? {
    background: "#f2f2ef",
    color: "#8a8a8a",
  });

const chipStyle = (type: "pass" | "fail" | "branch" | "cov") =>
  ({
    pass:   { background: "#edf7f1", color: "#1a7a4a" },
    fail:   { background: "#fdf0ee", color: "#c0392b" },
    branch: { background: "#f2f2ef", color: "#8a8a8a", border: "1px solid rgba(0,0,0,0.07)" },
    cov:    { background: "#eef3fc", color: "#1a4fa8" },
  }[type]);

export default function ErrorList({ pushes }: ErrorListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (pushes.length === 0) {
    return (
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "24px 20px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a" }}>
        No pushes yet.
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#0a0a0a", letterSpacing: "-0.2px" }}>Recent pushes</span>
        <button style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", border: "none", background: "none", cursor: "pointer" }}>All pushes →</button>
      </div>

      {pushes.slice(0, 8).map((p, i) => {
        const ic = iconStyle(p.status);
        const isExpanded = expanded === p.id;
        const hasFailed = p.failed_functions?.length > 0;

        return (
          <div key={p.id ?? i} style={{ borderBottom: i < pushes.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
            {/* Push row */}
            <div
              style={{ display: "flex", gap: 14, padding: "13px 20px", cursor: hasFailed ? "pointer" : "default", transition: "background 0.1s" }}
              onClick={() => hasFailed && setExpanded(isExpanded ? null : p.id)}
              onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.background = "#fafaf8"}
              onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 1, ...ic }}>
                <i className={p.status === "passed" ? "ti ti-check" : p.status === "failed" ? "ti ti-x" : "ti ti-alert-triangle"} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#0a0a0a" }}>{p.developer}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#c4c4c4" }}>{timeAgo(p.timestamp)}</span>
                    {hasFailed && (
                      <i className={`ti ti-chevron-${isExpanded ? "up" : "down"}`} style={{ fontSize: 11, color: "#8a8a8a" }} />
                    )}
                  </div>
                </div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.commit} · {p.branch}
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, padding: "2px 7px", borderRadius: 4, ...chipStyle(p.status === "passed" ? "pass" : "fail") }}>
                    {p.status}
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, padding: "2px 7px", borderRadius: 4, ...chipStyle("branch") }}>
                    {p.branch}
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, padding: "2px 7px", borderRadius: 4, ...chipStyle("cov") }}>
                    {p.coverage_percent}% cov
                  </span>
                  {hasFailed && (
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "#fdf0ee", color: "#c0392b" }}>
                      {p.failed_functions.length} function{p.failed_functions.length > 1 ? "s" : ""} failed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded: failed function details */}
            {isExpanded && hasFailed && (
              <div style={{ background: "#fafaf8", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "12px 20px 16px 62px" }}>
                {p.failed_functions.map((fn) => (
                  <div key={fn.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <i className="ti ti-function" style={{ fontSize: 12, color: "#c0392b" }} />
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, fontWeight: 500, color: "#0a0a0a" }}>{fn.name}()</span>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#c0392b", background: "#fdf0ee", borderRadius: 4, padding: "1px 6px" }}>
                        {fn.tests_passed}/{fn.tests_generated} passed
                      </span>
                      {fn.file && (
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8a8a8a" }}>{fn.file}</span>
                      )}
                    </div>
                    {fn.failure_output && (
                      <pre style={{
                        fontFamily: "DM Mono, monospace", fontSize: 10, color: "#3a3a3a",
                        background: "#fff", border: "1px solid rgba(192,57,43,0.15)",
                        borderLeft: "3px solid #c0392b", borderRadius: "0 6px 6px 0",
                        padding: "8px 12px", margin: 0, overflowX: "auto",
                        whiteSpace: "pre-wrap", lineHeight: 1.6,
                      }}>
                        {fn.failure_output}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
