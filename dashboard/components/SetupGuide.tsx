"use client";

import { useState } from "react";

interface Props {
  projectKey: string;
  projectName: string;
  onDone?: () => void;
}

function CopyLine({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f5f5f2", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "8px 12px" }}>
        <code style={{ flex: 1, fontFamily: "DM Mono, monospace", fontSize: 12, color: "#0a0a0a", wordBreak: "break-all" }}>{code}</code>
        <button
          onClick={copy}
          style={{ flexShrink: 0, background: copied ? "#edf7f1" : "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "4px 10px", fontFamily: "DM Mono, monospace", fontSize: 10, color: copied ? "#1a7a4a" : "#3a3a3a", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function SetupGuide({ projectKey, projectName, onDone }: Props) {
  const [tab, setTab] = useState<"new" | "existing">("new");

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#0a0a0a", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 16, color: "#2ea865" }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: "#fff", letterSpacing: "-0.2px" }}>Project created — {projectName}</span>
            </div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a" }}>Follow the steps below to connect your codebase</div>
          </div>
          {onDone && (
            <button onClick={onDone} style={{ background: "none", border: "none", color: "#8a8a8a", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      <div style={{ padding: "24px" }}>
        {/* Project key */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Your project key</div>
          <CopyLine label="" code={projectKey} />
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", marginTop: 4 }}>Keep this safe — it identifies your project when sending reports</div>
        </div>

        {/* Tab: new vs existing */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>What kind of project?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["new", "existing"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer", borderColor: tab === t ? "#0a0a0a" : "rgba(0,0,0,0.12)", background: tab === t ? "#0a0a0a" : "#f5f5f2", color: tab === t ? "#fff" : "#3a3a3a" }}
              >
                {t === "new" ? "New / fresh repo" : "Existing codebase"}
              </button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Step 1 */}
          <Step n={1} title="Install AutoTest CLI">
            <CopyLine label="Run in your terminal" code="pip install autotest-hook" />
          </Step>

          {/* Step 2 */}
          <Step n={2} title="Set your project key">
            <CopyLine label="Add to your shell profile (.bashrc / .zshrc)" code={`export AUTOTEST_PROJECT_KEY=${projectKey}`} />
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", marginTop: 4 }}>Or set it per-project in a .env file (add .env to .gitignore)</div>
          </Step>

          {tab === "new" ? (
            /* Step 3 — new project */
            <Step n={3} title="Install the git hook">
              <CopyLine label="Run once inside your project folder" code="cd your-project && autotest --install" />
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", marginTop: 4 }}>Every future <code>git push</code> will auto-generate and run tests for changed functions</div>
            </Step>
          ) : (
            /* Step 3 — existing project */
            <>
              <Step n={3} title="Run a full baseline scan">
                <CopyLine label="Scan all existing functions in the project" code="cd your-project && autotest --scan" />
                <CopyLine label="For JavaScript / TypeScript" code="autotest --scan --lang ts" />
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", marginTop: 4 }}>This generates tests for every function already in your codebase and sends a baseline report to the dashboard</div>
              </Step>

              <Step n={4} title="Install the git hook for future pushes">
                <CopyLine label="Run once inside your project folder" code="autotest --install" />
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", marginTop: 4 }}>After the baseline scan, every <code>git push</code> will only scan changed functions (fast)</div>
              </Step>
            </>
          )}
        </div>

        {onDone && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(0,0,0,0.07)", textAlign: "right" }}>
            <button onClick={onDone} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#0a0a0a", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              Done — go to project →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Mono, monospace", fontSize: 11, marginTop: 2 }}>
        {n}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#0a0a0a", letterSpacing: "-0.2px", marginBottom: 10 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
