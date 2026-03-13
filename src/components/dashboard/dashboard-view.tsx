"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { LogIn, LogOut, User, Sun, Moon } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StatCards } from "./stat-cards";
import { RepoCards } from "./repo-cards";
import { PipelineList } from "./pipeline-list";
import { AgentCards } from "./agent-cards";
import { ModelCards } from "./model-cards";
import { InfraCards } from "./infra-cards";
import { DashboardSection } from "./dashboard-section";
import {
  useGitHubRepos,
  useGitHubPipelines,
  useAzureAgents,
  useAllModels,
  useInfrastructure,
  useOllamaModels,
  useVercelDeployments,
  useProviderStatus,
  useAzureDiscovery,
} from "@/lib/hooks";
import {
  mockStats,
  mockRepos,
  mockPipelines,
  mockAgents,
  mockModels,
} from "@/lib/mock-data";
import type { DashboardStats } from "@/lib/types";

const STORAGE_KEY = "neural-architect-section-order";
const DEFAULT_ORDER = ["models", "agents", "infrastructure", "repositories", "pipelines"];

interface DashboardViewProps {
  activeSection: string;
}

function loadSectionOrder(): string[] {
  if (typeof window === "undefined") return DEFAULT_ORDER;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge in any new sections that weren't saved before
      const merged = [...parsed];
      for (const id of DEFAULT_ORDER) {
        if (!merged.includes(id)) merged.push(id);
      }
      return merged;
    }
  } catch {}
  return DEFAULT_ORDER;
}

export function DashboardView({ activeSection }: DashboardViewProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { data: repos, isLoading: reposLoading } = useGitHubRepos();
  const { data: pipelines, isLoading: pipelinesLoading } =
    useGitHubPipelines();
  const { data: agents } = useAzureAgents();
  const { data: models } = useAllModels();
  const { data: infra } = useInfrastructure();
  const { data: ollamaData } = useOllamaModels();
  const { data: vercelData } = useVercelDeployments();

  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_ORDER);

  // Load saved order on mount
  useEffect(() => {
    setSectionOrder(loadSectionOrder());
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((prev) => {
        const oldIndex = prev.indexOf(String(active.id));
        const newIndex = prev.indexOf(String(over.id));
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, []);

  const isConnected = !!session?.accessToken;

  // Use real data if connected, mock data as fallback
  const displayRepos = isConnected && repos ? repos : mockRepos;
  const displayPipelines =
    isConnected && pipelines ? pipelines : mockPipelines;
  const displayAgents = agents || mockAgents;
  const displayModels = models || mockModels;

  const displayInfra = infra || [];

  const stats: DashboardStats = isConnected
    ? {
        totalRepos: displayRepos.length,
        activePipelines: displayPipelines.filter(
          (p) => p.status === "running" || p.status === "success"
        ).length,
        deployedAgents: displayAgents.length,
        availableModels: displayModels.length,
        infraResources: displayInfra.length,
      }
    : mockStats;

  const sectionContent: Record<string, React.ReactNode> = {
    models: (
      <DashboardSection
        id="models"
        title="Models"
        count={displayModels.length}
        badge={
          ollamaData && ollamaData.total > 0 ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {ollamaData.running} local
            </span>
          ) : undefined
        }
      >
        <ModelCards models={displayModels} ollamaData={ollamaData} compact />
      </DashboardSection>
    ),
    agents: (
      <DashboardSection id="agents" title="AI Agents" count={displayAgents.length}>
        <AgentCards agents={displayAgents} compact />
      </DashboardSection>
    ),
    infrastructure: (
      <DashboardSection id="infrastructure" title="Infrastructure" count={displayInfra.length}>
        <InfraCards resources={displayInfra} vercelData={vercelData} compact />
      </DashboardSection>
    ),
    repositories: (
      <DashboardSection id="repositories" title="Repositories" count={displayRepos.length}>
        <RepoCards repos={displayRepos} loading={reposLoading && isConnected} compact />
      </DashboardSection>
    ),
    pipelines: (
      <DashboardSection id="pipelines" title="Pipelines" count={displayPipelines.length}>
        <PipelineList pipelines={displayPipelines} loading={pipelinesLoading && isConnected} compact />
      </DashboardSection>
    ),
  };

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
            {activeSection === "infrastructure" && "Infrastructure"}
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
            {activeSection === "infrastructure" &&
              "Cloud resources, deployments, and local services"}
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

        {/* Dashboard overview — draggable sections */}
        {activeSection === "dashboard" && (
          <>
            <StatCards stats={stats} />
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sectionOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-6 md:space-y-8">
                  {sectionOrder.map((id) => (
                    <div key={id}>{sectionContent[id]}</div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}

        {/* Individual sections */}
        {activeSection === "repositories" && (
          <RepoCards repos={displayRepos} loading={reposLoading && isConnected} initialLimit={100} />
        )}
        {activeSection === "pipelines" && (
          <PipelineList
            pipelines={displayPipelines}
            loading={pipelinesLoading && isConnected}
          />
        )}
        {activeSection === "agents" && <AgentCards agents={displayAgents} />}
        {activeSection === "models" && <ModelCards models={displayModels} ollamaData={ollamaData} />}
        {activeSection === "infrastructure" && (
          <InfraCards resources={displayInfra} vercelData={vercelData} />
        )}
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
  const { data: providerStatus } = useProviderStatus();
  const { data: azureDiscovery } = useAzureDiscovery();

  const azureConnected = azureDiscovery?.connected || !!providerStatus?.azure;
  const azureDetail = azureDiscovery?.connected
    ? `${azureDiscovery.subscriptions.length} subscription${azureDiscovery.subscriptions.length !== 1 ? "s" : ""} · ${azureDiscovery.aiServices.length} AI services`
    : providerStatus?.azureFoundry
    ? "Foundry + Models (Service Principal)"
    : null;

  const providers = [
    {
      name: "GitHub",
      connected: isConnected,
      username: username || null,
      icon: "⬡",
      available: true,
      category: "source",
      onConnect: () => signIn("github"),
      onDisconnect: () => signOut(),
    },
    {
      name: "Azure",
      connected: azureConnected,
      username: azureDetail,
      icon: "☁",
      available: true,
      category: "cloud",
      description: "Sign in with Microsoft to auto-discover subscriptions, AI services, and Foundry endpoints",
      envHint: azureConnected ? undefined : "Or set AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET in .env.local",
      onConnect: () => signIn("microsoft-entra-id"),
      onDisconnect: () => {},
    },
    {
      name: "OpenAI",
      connected: !!providerStatus?.openai,
      username: null,
      icon: "⚡",
      available: true,
      category: "ai",
      description: "List models and usage stats",
      envHint: "Set OPENAI_API_KEY in .env.local",
      onConnect: () => {},
      onDisconnect: () => {},
    },
    {
      name: "Anthropic",
      connected: !!providerStatus?.anthropic,
      username: null,
      icon: "🔶",
      available: true,
      category: "ai",
      description: "Claude models and capabilities",
      envHint: "Set ANTHROPIC_API_KEY in .env.local",
      onConnect: () => {},
      onDisconnect: () => {},
    },
    {
      name: "Ollama",
      connected: !!providerStatus?.ollama,
      username: null,
      icon: "🦙",
      available: true,
      category: "ai",
      description: "Local models running on your machine",
      envHint: "Auto-detected at localhost:11434",
      onConnect: () => {},
      onDisconnect: () => {},
    },
    {
      name: "HuggingFace",
      connected: !!providerStatus?.huggingface,
      username: null,
      icon: "🤗",
      available: true,
      category: "ai",
      description: "Your models and spaces",
      envHint: "Set HUGGINGFACE_TOKEN in .env.local",
      onConnect: () => {},
      onDisconnect: () => {},
    },
    {
      name: "Vercel",
      connected: !!providerStatus?.vercel,
      username: null,
      icon: "▲",
      available: true,
      category: "deploy",
      description: "Projects and deployment status",
      envHint: "Set VERCEL_TOKEN in .env.local",
      onConnect: () => {},
      onDisconnect: () => {},
    },
    {
      name: "GitLab",
      connected: false,
      username: null,
      icon: "◆",
      available: false,
      category: "source",
      onConnect: () => {},
      onDisconnect: () => {},
    },
    {
      name: "AWS",
      connected: false,
      username: null,
      icon: "◈",
      available: false,
      category: "cloud",
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
                  {"description" in p && p.description && !p.connected && (
                    <p className="text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  {"envHint" in p && p.envHint && !p.connected && (
                    <p className="text-xs text-muted-foreground/60 font-mono">
                      {p.envHint}
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

      {/* Azure Discovery Details */}
      {azureDiscovery?.connected && (
        <div>
          <h3 className="mb-1 text-lg font-semibold">Azure Discovery</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Auto-discovered from your {azureDiscovery.tokenSource === "oauth" ? "Microsoft account" : "Service Principal"}
          </p>
          <div className="space-y-3">
            {/* Subscriptions */}
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium mb-2">Subscriptions</p>
              <div className="space-y-2">
                {azureDiscovery.subscriptions.map((sub) => (
                  <div key={sub.subscriptionId} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{sub.displayName}</span>
                    <span className={`flex items-center gap-1.5 text-xs ${sub.state === "Enabled" ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sub.state === "Enabled" ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {sub.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Services / Foundry Endpoints */}
            {azureDiscovery.aiServices.length > 0 && (
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium mb-2">AI Services & Foundry Endpoints</p>
                <div className="space-y-2">
                  {azureDiscovery.aiServices.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-muted-foreground">{svc.name}</span>
                        {svc.endpoint && (
                          <p className="text-xs text-muted-foreground/60 font-mono truncate max-w-sm">
                            {svc.endpoint}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{svc.location}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resource Summary */}
            {azureDiscovery.resourceSummary && (
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium mb-2">Resource Summary</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "VMs", count: azureDiscovery.resourceSummary.vms },
                    { label: "App Services", count: azureDiscovery.resourceSummary.appServices },
                    { label: "Databases", count: azureDiscovery.resourceSummary.databases },
                    { label: "Containers", count: azureDiscovery.resourceSummary.containers },
                    { label: "AI Services", count: azureDiscovery.resourceSummary.ai },
                    { label: "Storage", count: azureDiscovery.resourceSummary.storage },
                    { label: "Total", count: azureDiscovery.resourceSummary.total },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <p className="text-lg font-semibold">{item.count}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
