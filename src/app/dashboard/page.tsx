"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("dashboard");

  // Link invite token to account on first dashboard load after invite sign-in
  useEffect(() => {
    const token = sessionStorage.getItem("na-invite-token");
    if (token) {
      sessionStorage.removeItem("na-invite-token");
      fetch("/api/auth/link-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_token: token }),
      }).catch(() => {});
    }
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} />
      <DashboardView activeSection={activeSection} />
    </div>
  );
}
