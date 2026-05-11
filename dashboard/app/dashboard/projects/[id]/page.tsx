"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDashboard, getProjects, DashboardData } from "@/lib/api";
import TrendChart from "@/components/TrendChart";
import FunctionTable from "@/components/FunctionTable";
import ErrorList from "@/components/ErrorList";
import AISuggestions from "@/components/AISuggestions";
import SetupGuide from "@/components/SetupGuide";

function KpiCard({ label, value, delta, deltaUp, barPct, barColor }: {
  label: string; value: string; delta: string; deltaUp?: boolean; barPct: number; barColor: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-1.5px", color: "#0a0a0a", lineHeight: 1, marginBottom: 8 }}>{value}</div>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: deltaUp === true ? "#1a7a4a" : deltaUp === false ? "#c0392b" : "#8a8a8a" }}>
        {deltaUp === true && <i className="ti ti-trending-up" style={{ fontSize: 12 }} />}
        {deltaUp === false && <i className="ti ti-trending-down" style={{ fontSize: 12 }} />}
        {delta}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#e8e8e3" }}>
        <div style={{ height: "100%", width: `${barPct}%`, background: barColor }} />
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [projectKey, setProjectKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = (session as { token?: string })?.token ?? "";

  useEffect(() => {
    if (!token || !id) return;
    Promise.all([
      getDashboard(id, token),
      getProjects(token),
    ])
      .then(([dash, projects]) => {
        setData(dash);
        const proj = projects.find((p) => p.id === id);
        if (proj) setProjectKey(proj.project_key);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) return (
    <div style={{ padding: 32, fontFamily: "DM Mono, monospace", fontSize: 12, color: "#8a8a8a" }}>Loading…</div>
  );

  if (error) return (
    <div style={{ padding: 32 }}>
      <div style={{ background: "#fdf0ee", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 10, padding: "12px 16px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#c0392b" }}>{error}</div>
    </div>
  );

  if (!data) return null;

  const passed = data.project.quality_gate === "passed";

  return (
    <>
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "#8a8a8a", cursor: "pointer", fontSize: 13, padding: 0 }}>
              Projects
            </button>
            <span style={{ color: "#c4c4c4" }}>/</span>
            <h1 style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.5px", color: "#0a0a0a" }}>{data.project.name}</h1>
          </div>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a", marginTop: 2 }}>
            main · last scan {data.recent_pushes[0] ? new Date(data.recent_pushes[0].timestamp).toLocaleString() : "never"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer", background: "#f2f2ef", color: "#3a3a3a", border: "1px solid rgba(0,0,0,0.12)" }}>
            <i className="ti ti-refresh" style={{ fontSize: 13 }} /> Rescan
          </button>
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer", background: "#0a0a0a", color: "#fff", border: "none" }}>
            <i className="ti ti-download" style={{ fontSize: 13 }} /> Export
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* No-data setup guide */}
        {data.recent_pushes.length === 0 && projectKey && (
          <SetupGuide projectKey={projectKey} projectName={data.project.name} />
        )}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <KpiCard
            label="Coverage" value={`${data.coverage.current}%`}
            delta={`${data.coverage.trend === "up" ? "+" : ""}${data.coverage.current - data.coverage.previous}% vs prev`}
            deltaUp={data.coverage.trend === "up" ? true : data.coverage.trend === "down" ? false : undefined}
            barPct={data.coverage.current} barColor="#0a0a0a"
          />
          <KpiCard
            label="Tests passed" value={String(data.recent_pushes.reduce((s, p) => s + (p.status === "passed" ? 1 : 0), 0))}
            delta="recent pushes" barPct={75} barColor="#2ea865"
          />
          <KpiCard
            label="Failures" value={String(data.recent_pushes.filter(p => p.status === "failed").length)}
            delta={`${data.recent_pushes.filter(p => p.status === "failed").length} failed pushes`}
            deltaUp={data.recent_pushes.filter(p => p.status === "failed").length > 0 ? false : undefined}
            barPct={data.recent_pushes.filter(p => p.status === "failed").length * 10} barColor="#c0392b"
          />
          <KpiCard
            label="Total pushes" value={String(data.recent_pushes.length)}
            delta={`${new Set(data.recent_pushes.map(p => p.developer)).size} developer(s)`}
            barPct={60} barColor="#8a8a8a"
          />
        </div>

        {/* Two column: chart+feed | quality gate+AI */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <TrendChart history={data.coverage.history} threshold={data.project.quality_gate_threshold} />
            <ErrorList pushes={data.recent_pushes} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Quality gate card */}
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#0a0a0a", letterSpacing: "-0.2px" }}>Quality gate</span>
                <button style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", cursor: "pointer", border: "none", background: "none", letterSpacing: "0.3px" }}>Configure</button>
              </div>
              <div style={{ padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 56, fontWeight: 300, letterSpacing: "-4px", color: "#0a0a0a", lineHeight: 1 }}>
                  {data.coverage.current}<span style={{ fontSize: 20, fontWeight: 300, color: "#8a8a8a" }}>%</span>
                </div>
                <div style={{ margin: "10px 0" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: passed ? "#edf7f1" : "#fdf0ee", color: passed ? "#1a7a4a" : "#c0392b", fontSize: 11, fontWeight: 500, fontFamily: "DM Mono, monospace", padding: "5px 12px", borderRadius: 20, border: `1px solid ${passed ? "rgba(46,168,101,0.2)" : "rgba(192,57,43,0.2)"}` }}>
                    <i className={passed ? "ti ti-shield-check" : "ti ti-shield-x"} style={{ fontSize: 12 }} />
                    {passed ? "PASSED" : "FAILED"}
                  </span>
                </div>
                <div style={{ marginTop: 16, borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 16, textAlign: "left" }}>
                  {[
                    { label: "Min coverage", value: `${data.coverage.current} ≥ ${data.project.quality_gate_threshold}`, ok: data.coverage.current >= data.project.quality_gate_threshold },
                    { label: "Failed pushes", value: String(data.recent_pushes.filter(p => p.status === "failed").length), ok: data.recent_pushes.filter(p => p.status === "failed").length === 0 },
                    { label: "Coverage trend", value: data.coverage.trend === "up" ? "↑ improving" : data.coverage.trend === "down" ? "↓ declining" : "→ stable", ok: data.coverage.trend !== "down" },
                  ].map((rule) => (
                    <div key={rule.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", fontSize: 12 }}>
                      <span style={{ color: "#8a8a8a" }}>{rule.label}</span>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: rule.ok ? "#1a7a4a" : "#c0392b" }}>{rule.value} {rule.ok ? "✓" : "✗"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <AISuggestions suggestions={data.ai_suggestions} />
          </div>
        </div>

        {/* File table */}
        <FunctionTable files={data.files} />
      </div>
    </>
  );
}
