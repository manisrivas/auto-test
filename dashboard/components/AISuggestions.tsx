"use client";

interface AISuggestionsProps { suggestions: string[]; }

const dotColors = ["#c0392b", "#b45309", "#1a4fa8", "#1a7a4a", "#8a8a8a"];

export default function AISuggestions({ suggestions }: AISuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#0a0a0a", letterSpacing: "-0.2px", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-sparkles" style={{ fontSize: 13 }} /> AI insights
        </span>
      </div>
      <div>
        {suggestions.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "12px 20px", borderBottom: i < suggestions.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none", cursor: "pointer", transition: "background 0.1s" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.background = "#fafaf8"}
            onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
          >
            <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginTop: 6, background: dotColors[i % dotColors.length] }} />
            <div style={{ fontSize: 12, color: "#8a8a8a", lineHeight: 1.6 }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
