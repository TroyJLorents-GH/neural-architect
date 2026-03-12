"use client";

import { StatCards } from "./stat-cards";
import { RepoCards } from "./repo-cards";
import { PipelineList } from "./pipeline-list";
import { AgentCards } from "./agent-cards";
import { ModelCards } from "./model-cards";
import {
  mockStats,
  mockRepos,
  mockPipelines,
  mockAgents,
  mockModels,
} from "@/lib/mock-data";

interface DashboardViewProps {
  activeSection: string;
}

export function DashboardView({ activeSection }: DashboardViewProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            {activeSection === "dashboard" && "Dashboard"}
            {activeSection === "repositories" && "Repositories"}
            {activeSection === "pipelines" && "Pipelines"}
            {activeSection === "agents" && "AI Agents"}
            {activeSection === "models" && "Models"}
            {activeSection === "settings" && "Settings"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeSection === "dashboard" &&
              "Overview of your AI workspace and recent activity"}
            {activeSection === "repositories" &&
              "All connected repositories across providers"}
            {activeSection === "pipelines" &&
              "CI/CD pipeline runs and deployment status"}
            {activeSection === "agents" &&
              "Your deployed AI agents and their activity"}
            {activeSection === "models" &&
              "Available AI models across providers"}
            {activeSection === "settings" &&
              "Manage connected accounts and preferences"}
          </p>
        </div>

        {/* Dashboard overview */}
        {activeSection === "dashboard" && (
          <>
            <StatCards stats={mockStats} />
            <ModelCards models={mockModels} />
            <AgentCards agents={mockAgents} />
            <RepoCards repos={mockRepos} />
            <PipelineList pipelines={mockPipelines} />
          </>
        )}

        {/* Individual sections */}
        {activeSection === "repositories" && <RepoCards repos={mockRepos} />}
        {activeSection === "pipelines" && (
          <PipelineList pipelines={mockPipelines} />
        )}
        {activeSection === "agents" && <AgentCards agents={mockAgents} />}
        {activeSection === "models" && <ModelCards models={mockModels} />}
        {activeSection === "settings" && <SettingsView />}
      </div>
    </div>
  );
}

function SettingsView() {
  const providers = [
    {
      name: "GitHub",
      connected: true,
      username: "TroyJLorents-GH",
      icon: "⬡",
    },
    { name: "GitLab", connected: false, username: null, icon: "◆" },
    {
      name: "Azure DevOps",
      connected: false,
      username: null,
      icon: "☁",
    },
    { name: "AWS", connected: false, username: null, icon: "◈" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Connected Accounts</h3>
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{p.icon}</span>
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  {p.connected && (
                    <p className="text-xs text-muted-foreground">
                      {p.username}
                    </p>
                  )}
                </div>
              </div>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  p.connected
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {p.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Appearance</h3>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">
              Switch between light and dark mode
            </p>
          </div>
          <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
            Toggle Theme
          </button>
        </div>
      </div>
    </div>
  );
}
