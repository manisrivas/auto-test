"use client";

import { useState } from "react";

interface Props {
  projectKey: string;
  projectName: string;
  onDone?: () => void;
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return { copied, copy };
}

function CopyChip({ code }: { code: string }) {
  const { copied, copy } = useCopy(code);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f5f5f2", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 6, padding: "5px 10px", marginTop: 6 }}>
      <code style={{ flex: 1, fontFamily: "DM Mono, monospace", fontSize: 11, color: "#0a0a0a", wordBreak: "break-all" }}>{code}</code>
      <button onClick={copy} style={{ flexShrink: 0, background: copied ? "#edf7f1" : "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 4, padding: "2px 8px", fontFamily: "DM Mono, monospace", fontSize: 9, color: copied ? "#1a7a4a" : "#3a3a3a", cursor: "pointer" }}>
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}

const steps = (projectKey: string, isNew: boolean) => [
  { title: "Install CLI", cmd: "pip install autotest-hook" },
  { title: "Set project key", cmd: `export AUTOTEST_PROJECT_KEY=${projectKey}` },
  ...(!isNew ? [{ title: "Baseline scan", cmd: "autotest --scan" }] : []),
  { title: "Install git hook", cmd: "autotest --install" },
];

export default function SetupGuide({ projectKey, projectName, onDone }: Props) {
  const [open, setOpen] = useState(true);
  const [isNew, setIsNew] = useState(false);

  if (!open) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(46,168,101,0.25)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      {/* Compact header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="ti ti-circle-check" style={{ fontSize: 15, color: "#2ea865" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{projectName} created</span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a" }}>— connect your CLI to start seeing reports</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {(["existing", "new"] as const).map((t) => (
              <button key={t} onClick={() => setIsNew(t === "new")}
                style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid", fontFamily: "DM Sans, sans-serif", fontSize: 10, fontWeight: 500, cursor: "pointer", borderColor: (isNew ? t === "new" : t === "existing") ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)", background: (isNew ? t === "new" : t === "existing") ? "rgba(255,255,255,0.12)" : "transparent", color: (isNew ? t === "new" : t === "existing") ? "#fff" : "rgba(255,255,255,0.4)" }}>
                {t === "new" ? "Fresh repo" : "Has code"}
              </button>
            ))}
          </div>
          {onDone && (
            <button onClick={onDone} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px" }}>×</button>
          )}
        </div>
      </div>

      {/* Steps in a single row */}
      <div style={{ padding: "14px 16px", display: "flex", gap: 12, overflowX: "auto" }}>
        {steps(projectKey, isNew).map((step, i) => (
          <div key={i} style={{ flex: "0 0 200px", background: "#fafaf8", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Mono, monospace", fontSize: 9, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0a0a0a" }}>{step.title}</span>
            </div>
            <CopyChip code={step.cmd} />
          </div>
        ))}
      </div>
    </div>
  );
}
