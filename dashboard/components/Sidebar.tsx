"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const nav = [
  {
    section: "Overview",
    items: [
      { label: "Projects",  icon: "ti-layout-dashboard", href: "/dashboard" },
    ],
  },
  {
    section: "Account",
    items: [
      { label: "Settings", icon: "ti-settings", href: "/dashboard/settings" },
    ],
  },
];

export default function Sidebar({ projectName }: { projectName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const plan = (session?.user as { plan?: string })?.plan ?? "free";
  const email = session?.user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <nav style={{ background: "#0a0a0a", width: 240, height: "100%", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: "28px 24px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "#fff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#0a0a0a", fontFamily: "DM Mono, monospace" }}>AT</span>
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 500, letterSpacing: "-0.3px" }}>AutoTest</div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, letterSpacing: "0.5px" }}>INTELLIGENCE LAYER</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: "16px 12px", flex: 1 }}>
        {nav.map((group) => (
          <div key={group.section}>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", padding: "12px 12px 6px" }}>
              {group.section}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <div
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 8, marginBottom: 1,
                    color: active ? "#fff" : "rgba(255,255,255,0.45)",
                    background: active ? "rgba(255,255,255,0.1)" : "transparent",
                    fontSize: 13, fontWeight: active ? 500 : 400,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 15, opacity: active ? 1 : 0.7 }} />
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Active project */}
      {projectName && (
        <div style={{ margin: 12, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", padding: 14 }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Active project</div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{projectName}</div>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#2ea865" }} />
            main · live
          </div>
        </div>
      )}

      {/* User footer */}
      <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#fff", flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1, textTransform: "uppercase", letterSpacing: "0.5px" }}>{plan} plan</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Log out"
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 15 }}
          >
            <i className="ti ti-logout" />
          </button>
        </div>
      </div>
    </nav>
  );
}
