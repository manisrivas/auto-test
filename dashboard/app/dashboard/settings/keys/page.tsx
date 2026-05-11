"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setEnterpriseKey } from "@/lib/api";

export default function KeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const plan = (session?.user as { plan?: string })?.plan ?? "free";
  const token = (session as { token?: string })?.token ?? "";
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated" && plan !== "enterprise") router.push("/dashboard/settings");
  }, [status, plan, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setSaving(true); setError(""); setSuccess(false);
    try { await setEnterpriseKey(apiKey.trim(), token); setSuccess(true); setApiKey(""); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/dashboard/settings")} style={{ background: "none", border: "none", color: "#8a8a8a", cursor: "pointer", fontSize: 13 }}>Settings</button>
        <span style={{ color: "#c4c4c4" }}>/</span>
        <h1 style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.5px", color: "#0a0a0a" }}>Enterprise API Key</h1>
      </div>
      <div style={{ padding: "28px 32px", maxWidth: 560 }}>
        <div style={{ background: "#fef8ee", border: "1px solid rgba(180,83,9,0.2)", borderRadius: 10, padding: "10px 14px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#b45309", marginBottom: 20, display: "flex", gap: 8 }}>
          <i className="ti ti-info-circle" style={{ flexShrink: 0, marginTop: 1 }} />
          Stored AES-encrypted. Never returned in any API response. Write-only field.
        </div>
        {success && <div style={{ background: "#edf7f1", border: "1px solid rgba(46,168,101,0.2)", borderRadius: 10, padding: "10px 14px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#1a7a4a", marginBottom: 16 }}>API key saved successfully.</div>}
        {error && <div style={{ background: "#fdf0ee", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 10, padding: "10px 14px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#c0392b", marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSave} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 24 }}>
          <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>Anthropic API Key</label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-..." style={{ width: "100%", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: "9px 12px", fontFamily: "DM Mono, monospace", fontSize: 12, color: "#0a0a0a", background: "#fafaf8", outline: "none", marginBottom: 16 }} />
          <button type="submit" disabled={saving || !apiKey.trim()} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#0a0a0a", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving || !apiKey.trim() ? 0.5 : 1 }}>
            {saving ? "Saving…" : "Save API key"}
          </button>
        </form>
      </div>
    </>
  );
}
