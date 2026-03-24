"use client";

import { useSession, signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useAzureAgents,
  useAllModels,
  useInfrastructure,
  useAzureDiscovery,
  useProviderStatus,
} from "@/lib/hooks";

const typeIcons: Record<string, string> = {
  vm: "🖥️",
  "app-service": "🌐",
  function: "⚡",
  container: "📦",
  database: "🗄️",
  storage: "💾",
  ai: "🧠",
  other: "●",
};

const statusColors: Record<string, string> = {
  running: "bg-emerald-500",
  stopped: "bg-gray-400",
  error: "bg-red-500",
  deploying: "bg-amber-500",
  unknown: "bg-gray-400",
  Enabled: "bg-emerald-500",
  Disabled: "bg-gray-400",
};

export function AzureView() {
  const { data: session } = useSession();
  const { data: discovery, isLoading: discoveryLoading } = useAzureDiscovery();
  const { data: providerStatus } = useProviderStatus();
  const { data: agents } = useAzureAgents();
  const { data: allModels } = useAllModels();
  const { data: infra } = useInfrastructure();

  const azureOAuthConnected = !!(session as unknown as { azureAccessToken?: string })?.azureAccessToken;
  const azureSpConnected = !!providerStatus?.azureServicePrincipal;
  const azureOAuthAvailable = !!providerStatus?.azureOAuthAvailable;
  const isConnected = discovery?.connected || azureSpConnected;

  // Filter to Azure-only data
  const azureModels = (allModels || []).filter((m) => m.provider === "Azure");
  const azureAgents = (agents || []).filter(
    (a) => a.provider === "azure-foundry"
  );
  const azureInfra = (infra || []).filter((r) => r.provider === "azure");

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-4xl mb-4">☁️</p>
          <h3 className="text-lg font-semibold mb-2">Connect to Azure</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Sign in with your Microsoft account to auto-discover subscriptions, resources,
            AI services, and Foundry agents — or configure Service Principal credentials in your environment.
          </p>
          {azureOAuthAvailable && (
            <button
              onClick={() => signIn("microsoft-entra-id")}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign in with Microsoft
            </button>
          )}
        </div>
      </div>
    );
  }

  const subscriptions = discovery?.subscriptions || [];
  const aiServices = discovery?.aiServices || [];
  const resourceSummary = discovery?.resourceSummary;

  return (
    <div className="space-y-8">
      {/* Connection status banner */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">☁️</span>
          <div>
            <p className="text-sm font-medium">
              Connected via {discovery?.tokenSource === "oauth" ? "Microsoft OAuth" : "Service Principal"}
            </p>
            <p className="text-xs text-muted-foreground">
              {subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""} ·{" "}
              {azureInfra.length} resources ·{" "}
              {aiServices.length} AI services ·{" "}
              {azureAgents.length} agents ·{" "}
              {azureModels.length} model deployments
            </p>
          </div>
        </div>
        {!azureOAuthConnected && azureOAuthAvailable && (
          <button
            onClick={() => signIn("microsoft-entra-id")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Upgrade to OAuth
          </button>
        )}
      </div>

      {/* Subscriptions */}
      {subscriptions.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Subscriptions</h3>
          <div className="space-y-2">
            {subscriptions.map((sub) => (
              <div
                key={sub.subscriptionId}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <p className="text-sm font-medium">{sub.displayName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{sub.subscriptionId}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-xs ${sub.state === "Enabled" ? "text-emerald-500" : "text-muted-foreground"}`}>
                  <span className={`h-2 w-2 rounded-full ${statusColors[sub.state] || "bg-gray-400"}`} />
                  {sub.state}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Resource Summary */}
      {resourceSummary && resourceSummary.total > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Resource Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "VMs", count: resourceSummary.vms, icon: "🖥️" },
              { label: "App Services", count: resourceSummary.appServices, icon: "🌐" },
              { label: "Databases", count: resourceSummary.databases, icon: "🗄️" },
              { label: "Containers", count: resourceSummary.containers, icon: "📦" },
              { label: "AI Services", count: resourceSummary.ai, icon: "🧠" },
              { label: "Storage", count: resourceSummary.storage, icon: "💾" },
              { label: "Total", count: resourceSummary.total, icon: "☁️" },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-xl mb-1">{item.icon}</p>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* AI Services & Foundry Endpoints */}
      {aiServices.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold">AI Services & Foundry</h3>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {aiServices.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {aiServices.map((svc) => (
              <Card key={svc.id} className="group transition-all hover:shadow-md hover:border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xl">🧠</span>
                    <Badge variant="secondary" className="text-xs">{svc.location}</Badge>
                  </div>
                  <CardTitle className="text-base font-semibold">{svc.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{svc.subscription}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-xs font-normal">
                      {svc.type.split("/").pop()}
                    </Badge>
                    {svc.endpoint && (
                      <p className="text-xs text-muted-foreground/70 font-mono truncate">
                        {svc.endpoint}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Foundry Agents */}
      {azureAgents.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold">Foundry Agents</h3>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {azureAgents.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {azureAgents.map((agent) => (
              <Card key={agent.id} className="group transition-all hover:shadow-md hover:border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xl">🤖</span>
                    <span className={`flex items-center gap-1.5 text-xs ${agent.status === "active" ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className={`h-2 w-2 rounded-full ${agent.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {agent.status}
                    </span>
                  </div>
                  <CardTitle className="text-base font-semibold">{agent.name}</CardTitle>
                  {agent.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs font-normal">{agent.type}</Badge>
                    {agent.lastInvocation && (
                      <Badge variant="outline" className="text-xs font-normal">
                        Last: {new Date(agent.lastInvocation).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Azure Model Deployments */}
      {azureModels.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold">Model Deployments</h3>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {azureModels.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {azureModels.map((model) => (
              <Card key={model.id} className="group transition-all hover:shadow-md hover:border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xl">🔮</span>
                    <Badge variant="secondary" className="text-xs">Azure</Badge>
                  </div>
                  <CardTitle className="text-base font-semibold">{model.name}</CardTitle>
                  {model.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{model.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {model.capabilities?.map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs font-normal capitalize">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* All Azure Resources */}
      {azureInfra.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold">All Resources</h3>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {azureInfra.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {azureInfra.map((resource) => (
              <Card key={resource.id} className="group transition-all hover:shadow-md hover:border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xl">{typeIcons[resource.type] || "●"}</span>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${statusColors[resource.status] || "bg-gray-400"}`} />
                      <span className="text-xs capitalize text-muted-foreground">{resource.status}</span>
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold">{resource.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{resource.region}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs font-normal">{resource.type}</Badge>
                    {resource.details &&
                      Object.entries(resource.details)
                        .filter(([, val]) => val)
                        .slice(0, 2)
                        .map(([key, val]) => (
                          <Badge key={key} variant="outline" className="text-xs font-normal">
                            {val || key}
                          </Badge>
                        ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Loading state */}
      {discoveryLoading && azureInfra.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Discovering Azure resources...
          </p>
        </div>
      )}
    </div>
  );
}
