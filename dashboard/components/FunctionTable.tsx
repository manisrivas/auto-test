"use client";

interface FileRow { name: string; coverage: number; risk: string; }
interface FunctionTableProps { files: FileRow[]; }

const riskPill = (risk: string) => ({
  high:   { background: "#fdf0ee", color: "#c0392b" },
  medium: { background: "#fef8ee", color: "#b45309" },
  low:    { background: "#edf7f1", color: "#1a7a4a" },
}[risk] ?? { background: "#f2f2ef", color: "#8a8a8a" });

const barColor = (pct: number) => pct < 60 ? "#c0392b" : pct < 80 ? "#b45309" : "#2ea865";

export default function FunctionTable({ files }: FunctionTableProps) {
  if (files.length === 0) return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "24px 20px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a" }}>No file data yet.</div>
  );

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#0a0a0a", letterSpacing: "-0.2px" }}>Files by coverage</span>
        <button style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", border: "none", background: "none", cursor: "pointer" }}>Sort by risk</button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {["File", "Coverage", "Risk"].map((h) => (
              <th key={h} style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "1.2px", textTransform: "uppercase", color: "#c4c4c4", padding: "10px 20px", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.07)", fontWeight: 400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {files.map((row, i) => (
            <tr key={row.name}
              style={{ borderBottom: i < files.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
              onMouseLeave={(e) => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
            >
              <td style={{ padding: "11px 20px", color: "#3a3a3a" }}>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#0a0a0a", display: "flex", alignItems: "center", gap: 7 }}>
                  <i className="ti ti-file-code" style={{ color: "#c4c4c4", fontSize: 13 }} />
                  {row.name}
                </span>
              </td>
              <td style={{ padding: "11px 20px", width: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 3, background: "#e8e8e3", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${row.coverage}%`, background: barColor(row.coverage), borderRadius: 99 }} />
                  </div>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, minWidth: 30, textAlign: "right", color: barColor(row.coverage) }}>{row.coverage}%</span>
                </div>
              </td>
              <td style={{ padding: "11px 20px" }}>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, padding: "2px 8px", borderRadius: 4, fontWeight: 500, ...riskPill(row.risk) }}>
                  {row.risk.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
