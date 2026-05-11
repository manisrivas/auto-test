"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getProjects, deleteProject, Project } from "@/lib/api";
import SetupGuide from "@/components/SetupGuide";
import NewProjectPanel from "@/components/NewProjectPanel";

export default function DashboardPage() {
  const { token, email, ready } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [newProject, setNewProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) { setLoading(false); return; }
    getProjects(token)
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ready, token]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Delete this project? All reports will be lost.")) return;
    setDeletingId(id);
    try {
      await deleteProject(id, token);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // silently ignore — project stays in list
    } finally {
      setDeletingId(null);
    }
  }

  function handleCreated(p: Project) {
    setProjects((prev) => [...prev, p]);
    setShowPanel(false);
    setNewProject(p);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.5px", color: "#0a0a0a" }}>Projects</h1>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a", marginTop: 2 }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {email}
          </p>
        </div>
        <button
          onClick={() => { setShowPanel((v) => !v); setNewProject(null); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: "#0a0a0a", color: "#fff" }}
        >
          <i className="ti ti-plus" style={{ fontSize: 13 }} /> New project
        </button>
      </div>

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
        {error && (
          <div style={{ background: "#fdf0ee", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 10, padding: "10px 14px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#c0392b" }}>{error}</div>
        )}

        {showPanel && (
          <NewProjectPanel onCreated={handleCreated} onCancel={() => setShowPanel(false)} />
        )}

        {newProject && (
          <SetupGuide
            projectKey={newProject.project_key}
            projectName={newProject.name}
            onDone={() => { setNewProject(null); router.push(`/dashboard/projects/${newProject.id}`); }}
          />
        )}

        {!ready || loading ? (
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#8a8a8a" }}>Loading…</div>
        ) : projects.length === 0 && !showPanel ? (
          <div style={{ background: "#fff", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 14, padding: "64px 32px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, background: "#f2f2ef", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <i className="ti ti-folder-plus" style={{ fontSize: 20, color: "#8a8a8a" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#0a0a0a", marginBottom: 6 }}>No projects yet</p>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a", marginBottom: 20 }}>
              Import a GitHub repo or create a project manually<br />to get your project key and start analysis
            </p>
            <button
              onClick={() => setShowPanel(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 8, border: "none", background: "#0a0a0a", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
            >
              <i className="ti ti-plus" style={{ fontSize: 13 }} /> Add first project
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 20, cursor: "pointer" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.15)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.07)"; }}
              >
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="ti ti-git-branch" style={{ fontSize: 14, color: "#8a8a8a" }} />
                    <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0a0a0a" }}>{p.name}</h3>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, p.id)}
                    disabled={deletingId === p.id}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "#c4c4c4", fontSize: 14, lineHeight: 1, borderRadius: 4 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#c0392b")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#c4c4c4")}
                    title="Delete project"
                  >
                    <i className="ti ti-trash" style={{ fontSize: 13 }} />
                  </button>
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
