"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { connectRepo, createProject, storeGitHubToken, GitHubRepo, Project } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Props {
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

export default function NewProjectPanel({ onCreated, onCancel }: Props) {
  const { token, email, githubToken, githubUsername, githubConnected } = useAuth();

  const [tab, setTab] = useState<"github" | "manual">("github");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState("");
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    if (!githubConnected) { setRepos([]); return; }
    if (tab !== "github" || !githubToken) return;
    setReposLoading(true);
    setReposError("");
    fetch("https://api.github.com/user/repos?per_page=100&sort=updated&type=all", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(data.message ?? "GitHub API error");
        setRepos(data.map((r: Record<string, unknown>) => ({
          id: r.id as number,
          full_name: r.full_name as string,
          name: r.name as string,
          private: r.private as boolean,
          language: r.language as string | null,
          updated_at: r.updated_at as string,
          connected: false,
        })));
      })
      .catch((e) => setReposError(e.message ?? "Failed to load repositories"))
      .finally(() => setReposLoading(false));
  }, [tab, githubToken]);

  function getToken(): string {
    if (!token) throw new Error("Not authenticated — please log in again");
    return token;
  }

  async function handleConnect(repo: GitHubRepo) {
    setConnecting(repo.full_name);
    setReposError("");
    try {
      const activeToken = getToken();
      if (githubToken) {
        await storeGitHubToken(githubToken, githubUsername, activeToken).catch(() => {});
      }
      const result = await connectRepo(repo.full_name, repo.name, activeToken);
      setRepos((prev) => prev.map((r) => r.full_name === repo.full_name ? { ...r, connected: true } : r));
      onCreated({
        id: result.project_id,
        name: repo.name,
        project_key: result.project_key,
        quality_gate_threshold: 80,
      });
    } catch (e: unknown) {
      setReposError(e instanceof Error ? e.message : "Failed to connect repo");
      setConnecting(null);
    }
  }

  async function handleManualCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setManualError("");
    try {
      const activeToken = getToken();
      const p = await createProject(name.trim(), 80, activeToken);
      onCreated(p);
    } catch (e: unknown) {
      setManualError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, color: "#0a0a0a", letterSpacing: "-0.3px" }}>Add a project</h2>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "#8a8a8a", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        {([["github", "Import from GitHub"], ["manual", "Create manually"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: tab === t ? "2px solid #0a0a0a" : "2px solid transparent", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: tab === t ? 600 : 400, color: tab === t ? "#0a0a0a" : "#8a8a8a", cursor: "pointer", marginBottom: -1 }}>
            <i className={`ti ${t === "github" ? "ti-brand-github" : "ti-pencil"}`} style={{ marginRight: 6, fontSize: 13 }} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {tab === "github" && (
          !githubConnected ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: 48, height: 48, background: "#0a0a0a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <i className="ti ti-brand-github" style={{ fontSize: 24, color: "#fff" }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#0a0a0a", marginBottom: 6 }}>Connect your GitHub account</p>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a", marginBottom: 24, lineHeight: 1.7 }}>
                Sign in with GitHub to see your repositories<br />and import them with one click.
              </p>
              <button
                onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0a0a0a", color: "#fff", borderRadius: 8, padding: "10px 24px", fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer" }}
              >
                <i className="ti ti-brand-github" style={{ fontSize: 15 }} />
                Sign in with GitHub
              </button>
            </div>
          ) : reposLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} style={{ background: "#f5f5f2", borderRadius: 12, height: 88 }} />
              ))}
            </div>
          ) : (
            <>
              {reposError && (
                <div style={{ background: "#fdf0ee", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 8, padding: "8px 12px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#c0392b", marginBottom: 14 }}>{reposError}</div>
              )}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#8a8a8a" }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${repos.length} repositories…`}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: "8px 12px 8px 32px", fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "#0a0a0a", background: "#fafaf8", outline: "none" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, maxHeight: 360, overflowY: "auto" }}>
                {filtered.length === 0 ? (
                  <div style={{ gridColumn: "1/-1", padding: "24px", textAlign: "center", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a" }}>No repositories found</div>
                ) : filtered.map((repo) => (
                  <div key={repo.id} style={{ background: "#fafaf8", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.18)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.08)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <i className="ti ti-git-branch" style={{ fontSize: 14, color: "#8a8a8a", marginTop: 1, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#0a0a0a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{repo.name}</div>
                        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8a8a8a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{repo.full_name}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {repo.language && <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#3a3a3a", background: "#ebebeb", borderRadius: 4, padding: "2px 6px" }}>{repo.language}</span>}
                      {repo.private && <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#b45309", background: "#fef8ee", border: "1px solid rgba(180,83,9,0.2)", borderRadius: 4, padding: "2px 6px" }}>private</span>}
                    </div>
                    {repo.connected ? (
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#1a7a4a", background: "#edf7f1", border: "1px solid rgba(46,168,101,0.2)", borderRadius: 6, padding: "5px 0", textAlign: "center" }}>✓ Connected</span>
                    ) : (
                      <button
                        onClick={() => handleConnect(repo)}
                        disabled={connecting === repo.full_name}
                        style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, fontWeight: 500, color: "#fff", background: "#0a0a0a", border: "none", borderRadius: 6, padding: "6px 0", cursor: "pointer", opacity: connecting === repo.full_name ? 0.5 : 1 }}
                      >
                        {connecting === repo.full_name ? "Adding…" : "Add project"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", marginTop: 12 }}>
                Signed in as <strong>{githubUsername}</strong> · {repos.length} repositories
              </div>
            </>
          )
        )}

        {tab === "manual" && (
          <form onSubmit={handleManualCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", letterSpacing: "0.5px", marginBottom: 6 }}>PROJECT NAME</label>
              <input
                autoFocus value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. my-api, frontend, payments-service"
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: "9px 12px", fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "#0a0a0a", background: "#fafaf8", outline: "none" }}
              />
            </div>
            {manualError && (
              <div style={{ background: "#fdf0ee", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 8, padding: "8px 12px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#c0392b" }}>{manualError}</div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "#f2f2ef", color: "#3a3a3a", fontFamily: "DM Sans, sans-serif", fontSize: 12, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={creating || !name.trim()} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#0a0a0a", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer", opacity: creating || !name.trim() ? 0.5 : 1 }}>
                {creating ? "Creating…" : "Create project"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
