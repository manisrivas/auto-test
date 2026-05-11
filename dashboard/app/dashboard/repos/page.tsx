"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getGitHubRepos, connectRepo, storeGitHubToken, GitHubRepo } from "@/lib/api";

export default function ReposPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";
  const githubToken = (session as { githubToken?: string })?.githubToken ?? "";
  const githubUsername = (session as { githubUsername?: string })?.githubUsername ?? "";

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !githubToken) return;
    // Store GitHub token in backend then fetch repos
    storeGitHubToken(githubToken, githubUsername, token)
      .then(() => getGitHubRepos(token))
      .then(setRepos)
      .catch(() => setError("Failed to load repositories"))
      .finally(() => setLoading(false));
    setLoading(true);
  }, [token, githubToken, githubUsername]);

  async function handleConnect(repo: GitHubRepo) {
    setConnecting(repo.full_name);
    try {
      await connectRepo(repo.full_name, repo.name, token);
      setDone(repo.full_name);
      setRepos(prev => prev.map(r => r.full_name === repo.full_name ? { ...r, connected: true } : r));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setConnecting(null);
    }
  }

  const isGitHubConnected = !!githubToken;

  return (
    <>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <h1 style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.5px", color: "#0a0a0a" }}>Repositories</h1>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a", marginTop: 2 }}>Connect GitHub repos to enable push analysis</p>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 720 }}>
        {!isGitHubConnected && (
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 40, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, background: "#0a0a0a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <i className="ti ti-brand-github" style={{ fontSize: 24, color: "#fff" }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 500, color: "#0a0a0a", marginBottom: 8 }}>Connect your GitHub account</h2>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a", marginBottom: 24, lineHeight: 1.7 }}>
              Sign in with GitHub to link your repositories.<br />
              We&apos;ll automatically run analysis on every push.
            </p>
            <a
              href="/api/auth/signin/github"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0a0a0a", color: "#fff", borderRadius: 8, padding: "10px 24px", fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 500, textDecoration: "none" }}
            >
              <i className="ti ti-brand-github" style={{ fontSize: 16 }} />
              Connect GitHub
            </a>
          </div>
        )}

        {isGitHubConnected && loading && (
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#8a8a8a", padding: 32 }}>Loading repositories…</div>
        )}

        {error && (
          <div style={{ background: "#fdf0ee", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 10, padding: "10px 14px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#c0392b", marginBottom: 16 }}>{error}</div>
        )}

        {isGitHubConnected && !loading && repos.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)", fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#8a8a8a" }}>
              {repos.length} repositories
            </div>
            {repos.map((repo, i) => (
              <div key={repo.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < repos.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <i className="ti ti-git-branch" style={{ fontSize: 16, color: "#8a8a8a" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0a0a0a" }}>{repo.full_name}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                      {repo.language && <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a" }}>{repo.language}</span>}
                      {repo.private && <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#b45309", background: "#fef8ee", border: "1px solid rgba(180,83,9,0.2)", borderRadius: 4, padding: "1px 6px" }}>private</span>}
                    </div>
                  </div>
                </div>
                {repo.connected || done === repo.full_name ? (
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#1a7a4a", background: "#edf7f1", border: "1px solid rgba(46,168,101,0.2)", borderRadius: 6, padding: "4px 12px" }}>
                    Connected
                  </span>
                ) : (
                  <button
                    onClick={() => handleConnect(repo)}
                    disabled={connecting === repo.full_name}
                    style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#fff", background: "#0a0a0a", border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", opacity: connecting === repo.full_name ? 0.5 : 1 }}
                  >
                    {connecting === repo.full_name ? "Connecting…" : "Connect"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
