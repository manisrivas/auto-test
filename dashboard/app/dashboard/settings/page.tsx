"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import PlanBadge from "@/components/PlanBadge";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const plan = (session?.user as { plan?: string })?.plan ?? "free";

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
      <span style={{ fontSize: 13, color: "#3a3a3a" }}>{label}</span>
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

        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "4px 20px" }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#8a8a8a", paddingTop: 16, paddingBottom: 8 }}>Account</div>
          {row("Email", <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12 }}>{session?.user?.email}</span>)}
          {row("Plan", <PlanBadge plan={plan} />)}
          {row("Log out",
            <button onClick={() => signOut({ callbackUrl: "/" })} style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#c0392b", background: "none", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>
              Sign out
            </button>
          )}
          <div style={{ paddingBottom: 6 }} />
        </div>

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
