"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/lib/auth-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#fafaf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#8a8a8a" }}>Loading…</div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <div style={{ width: 240, flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          <Sidebar />
        </div>
        <div style={{ flex: 1, background: "#fafaf8", overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </AuthProvider>
  );
}
