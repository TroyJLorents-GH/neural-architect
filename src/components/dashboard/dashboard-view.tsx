"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { LogIn, LogOut, User, Sun, Moon } from "lucide-react";
import { StatCards } from "./stat-cards";
import { RepoCards } from "./repo-cards";
import { PipelineList } from "./pipeline-list";
import { AgentCards } from "./agent-cards";
import { ModelCards } from "./model-cards";
import { useGitHubRepos, useGitHubPipelines } from "@/lib/hooks";
import {
  mockStats,
  mockRepos,
  mockPipelines,
  mockAgents,
  mockModels,
} from "@/lib/mock-data";
import type { DashboardStats } from "@/lib/types";

interface DashboardViewProps {
  activeSection: string;
}

export function DashboardView({ activeSection }: DashboardViewProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { data: repos, isLoading: reposLoading } = useGitHubRepos();
  const { data: pipelines, isLoading: pipelinesLoading } =
    useGitHubPipelines();

  const isConnected = !!session?.accessToken;

  // Use real data if connected, mock data as fallback
  const displayRepos = isConnected && repos ? repos : mockRepos;
  const displayPipelines =
    isConnected && pipelines ? pipelines : mockPipelines;

  const stats: DashboardStats = isConnected
    ? {
        totalRepos: displayRepos.length,
        activePipelines: displayPipelines.filter(
          (p) => p.status === "running" || p.status === "success"
        ).length,
        deployedAgents: mockAgents.length,
        availableModels: mockModels.length,
      }
    : mockStats;

  return (
    <div className="flex-1 overflow-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-4 md:px-8 py-3 backdrop-blur-sm">
        <div className="w-10 md:w-0" /> {/* Spacer for mobile hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Toggle theme"
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
          </button>
        {isConnected ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
              <span className="text-muted-foreground">
                {session?.user?.name}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </>
        ) : (
          <button
            onClick={() => signIn("github")}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign in with GitHub
          </button>
        )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-8">
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
          {!isConnected && (
            <p className="mt-2 text-xs text-amber-500">
              Showing demo data — sign in with GitHub to see your real repos and
              pipelines
            </p>
          )}
        </div>

        {/* Dashboard overview */}
        {activeSection === "dashboard" && (
          <>
            <StatCards stats={stats} />
            <ModelCards models={mockModels} />
            <AgentCards agents={mockAgents} />
            <RepoCards repos={displayRepos} loading={reposLoading && isConnected} />
            <PipelineList
              pipelines={displayPipelines}
              loading={pipelinesLoading && isConnected}
            />
          </>
        )}

        {/* Individual sections */}
        {activeSection === "repositories" && (
          <RepoCards repos={displayRepos} loading={reposLoading && isConnected} />
        )}
        {activeSection === "pipelines" && (
          <PipelineList
            pipelines={displayPipelines}
            loading={pipelinesLoading && isConnected}
          />
        )}
        {activeSection === "agents" && <AgentCards agents={mockAgents} />}
        {activeSection === "models" && <ModelCards models={mockModels} />}
        {activeSection === "settings" && (
          <SettingsView
            isConnected={isConnected}
            username={session?.user?.name}
          />
        )}
      </div>
    </div>
  );
}

function SettingsView({
  isConnected,
  username,
}: {
  isConnected: boolean;
  username?: string | null;
}) {
  const { theme, setTheme } = useTheme();
  const providers = [
    {
      name: "GitHub",
      connected: isConnected,
      username: username || null,
      icon: "⬡",
      available: true,
      onConnect: () => signIn("github"),
      onDisconnect: () => signOut(),
    },
    {
      name: "GitLab",
      connected: false,
      username: null,
      icon: "◆",
      available: false,
      onConnect: () => {},
      onDisconnect: () => {},
    },
    {
      name: "Azure DevOps",
      connected: false,
      username: null,
      icon: "☁",
      available: false,
      onConnect: () => {},
      onDisconnect: () => {},
    },
    {
      name: "AWS",
      connected: false,
      username: null,
      icon: "◈",
      available: false,
      onConnect: () => {},
      onDisconnect: () => {},
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-1 text-lg font-semibold">Connected Accounts</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Connect your accounts to pull in repos, pipelines, and infrastructure data
        </p>
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{p.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.connected && (
                      <span className="flex items-center gap-1 text-xs text-emerald-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                    )}
                  </div>
                  {p.connected && p.username && (
                    <p className="text-xs text-muted-foreground">
                      {p.username}
                    </p>
                  )}
                </div>
              </div>
              {p.available ? (
                <button
                  onClick={p.connected ? p.onDisconnect : p.onConnect}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    p.connected
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {p.connected ? "Disconnect" : "Connect"}
                </button>
              ) : (
                <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
                  Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-lg font-semibold">Appearance</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Customize the look and feel of your dashboard
        </p>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">
              Switch between light and dark mode
            </p>
          </div>
          <div className="flex gap-2">
            {["light", "dark", "system"].map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors capitalize ${
                  theme === t
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-accent"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-lg font-semibold">Data</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Storage and caching configuration
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">Azure Cosmos DB</p>
              <p className="text-xs text-muted-foreground">
                Persist user preferences and cached data
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Optional
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
