"use client";

interface PlanBadgeProps { plan: string; }

const styles: Record<string, { background: string; color: string; border: string }> = {
  free:       { background: "#f2f2ef", color: "#8a8a8a",  border: "1px solid rgba(0,0,0,0.1)" },
  pro:        { background: "#eef3fc", color: "#1a4fa8",  border: "1px solid rgba(26,79,168,0.2)" },
  enterprise: { background: "#f5f0ff", color: "#6b21a8",  border: "1px solid rgba(107,33,168,0.2)" },
};

export default function PlanBadge({ plan }: PlanBadgeProps) {
  const s = styles[plan] ?? styles.free;
  return (
    <span style={{ ...s, fontFamily: "DM Mono, monospace", fontSize: 9, fontWeight: 500, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.8px", textTransform: "uppercase" }}>
      {plan}
    </span>
  );
}
