"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBilling, BillingInfo } from "@/lib/api";
import PlanBadge from "@/components/PlanBadge";

export default function PlanPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const token = (session as { token?: string })?.token ?? "";
  const plan = (session?.user as { plan?: string })?.plan ?? "free";

  useEffect(() => {
    if (!token) return;
    getBilling(token).then(setBilling).catch(() => null);
  }, [token]);

  const used = billing?.ai_calls_used ?? 0;
  const limit = billing?.ai_calls_limit ?? (plan === "free" ? 50 : plan === "pro" ? 500 : 0);
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  return (
    <>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/dashboard/settings")} style={{ background: "none", border: "none", color: "#8a8a8a", cursor: "pointer", fontSize: 13 }}>Settings</button>
        <span style={{ color: "#c4c4c4" }}>/</span>
        <h1 style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.5px", color: "#0a0a0a" }}>Plan &amp; Billing</h1>
      </div>
      <div style={{ padding: "28px 32px", maxWidth: 560 }}>

        {/* Current usage */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#0a0a0a" }}>Current plan</span>
            <PlanBadge plan={plan} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a", textTransform: "uppercase", letterSpacing: "0.8px" }}>Pushes this month</span>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#0a0a0a" }}>{used}{limit > 0 ? ` / ${limit}` : ""}</span>
            </div>
            <div style={{ height: 3, background: "#e8e8e3", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct > 85 ? "#c0392b" : "#0a0a0a", borderRadius: 99, transition: "width 0.3s" }} />
            </div>
          </div>
          {billing && (
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.07)" }}>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8a8a8a" }}>Tests generated</span>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#0a0a0a" }}>{billing.tests_generated}</span>
            </div>
          )}
        </div>

        {/* Pricing coming soon */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 32, textAlign: "center" }}>
          <div style={{ width: 40, height: 40, background: "#f2f2ef", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <i className="ti ti-credit-card" style={{ fontSize: 20, color: "#8a8a8a" }} />
          </div>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: "#0a0a0a", marginBottom: 8 }}>Pricing coming soon</h2>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a8a8a", lineHeight: 1.7 }}>
            We&apos;re finalising our pricing plans.<br />
            You&apos;re on the free tier while we get things ready.
          </p>
          <a href="mailto:sales@autotest.dev" style={{ display: "inline-block", marginTop: 20, fontFamily: "DM Mono, monospace", fontSize: 11, color: "#1a4fa8", background: "#eef3fc", border: "1px solid rgba(26,79,168,0.15)", borderRadius: 8, padding: "8px 20px", textDecoration: "none" }}>
            Contact us for early pricing →
          </a>
        </div>

      </div>
    </>
  );
}
