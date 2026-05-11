"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getProjects, createProject, Project } from "@/lib/api";
import SetupGuide from "@/components/SetupGuide";

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState<Project | null>(null);

  const token = (session as { token?: string })?.token ?? "";

  useEffect(() => {
    if (!token) return;
    getProjects(token)
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await createProject(newName.trim(), 80, token);
      setProjects((prev) => [...prev, p]);
      setNewName("");
      setShowForm(false);
      setNewProject(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.5px", color: "#0a0a0a" }}>Projects</h1>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a", marginTop: 2 }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {session?.user?.email}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: "#0a0a0a", color: "#fff", letterSpacing: "-0.1px" }}
          >
            <i className="ti ti-plus" style={{ fontSize: 13 }} /> New project
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
        {error && (
          <div style={{ background: "#fdf0ee", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 10, padding: "10px 14px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#c0392b" }}>
            {error}
          </div>
        )}

        {/* Create form */}
        {showForm && !newProject && (
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "20px" }}>
            <form onSubmit={handleCreate} style={{ display: "flex", gap: 10 }}>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name (e.g. my-api)"
                style={{ flex: 1, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: "8px 12px", fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "#0a0a0a", background: "#fafaf8", outline: "none" }}
              />
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "#f2f2ef", color: "#3a3a3a", fontFamily: "DM Sans, sans-serif", fontSize: 12, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={creating || !newName.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0a0a0a", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer", opacity: creating || !newName.trim() ? 0.5 : 1 }}>
                {creating ? "Creating…" : "Create"}
              </button>
            </form>
          </div>
        )}

        {/* Setup guide — shown immediately after project creation */}
        {newProject && (
          <SetupGuide
            projectKey={newProject.project_key}
            projectName={newProject.name}
            onDone={() => { setNewProject(null); router.push(`/dashboard/projects/${newProject.id}`); }}
          />
        )}

        {loading ? (
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#8a8a8a" }}>Loading…</div>
        ) : projects.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 14, padding: "64px 32px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, background: "#f2f2ef", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <i className="ti ti-folder-plus" style={{ fontSize: 20, color: "#8a8a8a" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#0a0a0a", marginBottom: 6 }}>No projects yet</p>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a", marginBottom: 20 }}>Create a project to get your project key, then run<br /><code>autotest --install</code> or <code>autotest --scan</code> in your repo</p>
            <button
              onClick={() => setShowForm(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 8, border: "none", background: "#0a0a0a", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
            >
              <i className="ti ti-plus" style={{ fontSize: 13 }} /> Create first project
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 20, cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.15)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.07)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0a0a0a", letterSpacing: "-0.2px" }}>{p.name}</h3>
                  <i className="ti ti-chevron-right" style={{ color: "#c4c4c4", fontSize: 15 }} />
                </div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", marginTop: 6 }}>{p.project_key}</div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-shield-check" style={{ fontSize: 13, color: "#8a8a8a" }} />
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a" }}>Gate: {p.quality_gate_threshold}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
