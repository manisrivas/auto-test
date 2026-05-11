"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PlanBadge from "@/components/PlanBadge";
import { disconnectGitHub } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { token, email, githubUsername, ready } = useAuth();
  const router = useRouter();
  const plan = (session?.user as { plan?: string })?.plan ?? "free";
  const githubConnected = !!githubUsername;

  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState("");

  async function handleDisconnect() {
    if (!confirm("Disconnect GitHub? Your connected repos will still exist as projects but webhooks will stop working.")) return;
    if (!token) { setDisconnectError("Still loading auth — please wait a moment and try again."); return; }
    setDisconnecting(true);
    setDisconnectError("");
    try {
      await disconnectGitHub(token);
      await signOut({ callbackUrl: "/login" });
    } catch (e: unknown) {
      setDisconnectError(e instanceof Error ? e.message : "Failed to disconnect");
      setDisconnecting(false);
    }
  }

  const row = (label: string, value: React.ReactNode, sub?: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
      <div>
        <span style={{ fontSize: 13, color: "#3a3a3a" }}>{label}</span>
        {sub && <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", marginTop: 2 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 13 }}>{value}</span>
    </div>
  );

  return (
    <>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <h1 style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.5px", color: "#0a0a0a" }}>Settings</h1>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a", marginTop: 2 }}>Account and billing preferences</p>
      </div>

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>

        {/* Account */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "4px 20px" }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#8a8a8a", paddingTop: 16, paddingBottom: 8 }}>Account</div>
          {row("Email", <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12 }}>{email || session?.user?.email}</span>)}
          {row("Plan", <PlanBadge plan={plan} />)}
          {row("Log out", (
            <button onClick={() => signOut({ callbackUrl: "/" })} style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#c0392b", background: "none", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>
              Sign out
            </button>
          ))}
          <div style={{ paddingBottom: 6 }} />
        </div>

        {/* GitHub */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "4px 20px" }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#8a8a8a", paddingTop: 16, paddingBottom: 8 }}>GitHub</div>
          {githubConnected ? (
            <>
              {row(
                "Connected account",
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "DM Mono, monospace", fontSize: 11, color: "#1a7a4a" }}>
                  <i className="ti ti-brand-github" style={{ fontSize: 13 }} />
                  {githubUsername}
                </span>,
                "GitHub OAuth is active — repos can be imported"
              )}
              {row("Disconnect", (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting || !ready || !token}
                    style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#c0392b", background: "none", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 6, padding: "4px 12px", cursor: "pointer", opacity: (disconnecting || !ready || !token) ? 0.4 : 1 }}
                  >
                    {!ready ? "Loading…" : disconnecting ? "Disconnecting…" : "Disconnect GitHub"}
                  </button>
                  {disconnectError && <span style={{ fontSize: 10, color: "#c0392b", fontFamily: "DM Mono, monospace" }}>{disconnectError}</span>}
                </div>
              ))}
            </>
          ) : (
            row(
              "GitHub",
              <button
                onClick={() => signIn("github", { callbackUrl: "/dashboard/settings" })}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "DM Mono, monospace", fontSize: 11, color: "#fff", background: "#0a0a0a", border: "none", borderRadius: 6, padding: "5px 14px", cursor: "pointer" }}
              >
                <i className="ti ti-brand-github" style={{ fontSize: 13 }} />
                Connect GitHub
              </button>,
              "Connect to import repos and enable webhooks"
            )
          )}
          <div style={{ paddingBottom: 6 }} />
        </div>

        {/* Billing */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "4px 20px" }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#8a8a8a", paddingTop: 16, paddingBottom: 8 }}>Billing</div>
          {row("Subscription", <button onClick={() => router.push("/dashboard/settings/plan")} style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#1a4fa8", background: "#eef3fc", border: "1px solid rgba(26,79,168,0.15)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>Manage plan →</button>)}
          {plan === "enterprise" && row("API Key", <button onClick={() => router.push("/dashboard/settings/keys")} style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#3a3a3a", background: "#f2f2ef", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>Manage key →</button>)}
          <div style={{ paddingBottom: 6 }} />
        </div>

      </div>
    </>
  );
}
