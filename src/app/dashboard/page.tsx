"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("dashboard");

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} />
      <DashboardView activeSection={activeSection} />
    </div>
  );
}
