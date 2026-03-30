"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { ArrowDownAZ, ArrowUpZA, ChevronDown, ChevronUp, ChevronRight, GripVertical, Folder, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  useAzureAgents,
  useAllModels,
  useInfrastructure,
  useAzureDiscovery,
  useProviderStatus,
  useAzureResourceGroups,
  useAzureResourceGroupResources,
} from "@/lib/hooks";

const STORAGE_KEY = "neural-architect-azure-section-order";
const DEFAULT_ORDER = ["subscriptions", "resource-summary", "resource-groups", "ai-services", "agents", "models", "resources"];

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

// --- Reusable sort toggle ---
type SortMode = "default" | "az" | "za";

function SortToggle({ sort, onSort }: { sort: SortMode; onSort: (s: SortMode) => void }) {
  const cycle = () => {
    if (sort === "default") onSort("az");
    else if (sort === "az") onSort("za");
    else onSort("default");
  };
  return (
    <button
      onClick={cycle}
      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        sort !== "default"
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
      title={sort === "default" ? "Sort A-Z" : sort === "az" ? "Sort Z-A" : "Default order"}
    >
      {sort === "za" ? <ArrowUpZA className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />}
      {sort !== "default" && <span>{sort === "az" ? "A-Z" : "Z-A"}</span>}
    </button>
  );
}

// --- Expandable card grid with sort ---
function CardGrid<T extends { _sortKey: string }>({
  items,
  initialLimit = 9,
  renderCard,
  columns = "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  sortable = true,
}: {
  items: T[];
  initialLimit?: number;
  renderCard: (item: T) => React.ReactNode;
  columns?: string;
  sortable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState<SortMode>("default");

  const sorted = [...items].sort((a, b) => {
    if (sort === "az") return a._sortKey.localeCompare(b._sortKey);
    if (sort === "za") return b._sortKey.localeCompare(a._sortKey);
    return 0;
  });

  const hasMore = sorted.length > initialLimit;
  const visible = expanded ? sorted : sorted.slice(0, initialLimit);
  const remaining = sorted.length - initialLimit;

  return (
    <div>
      {sortable && items.length > 1 && (
        <div className="mb-3 flex justify-end">
          <SortToggle sort={sort} onSort={setSort} />
        </div>
      )}
      <div className={`grid gap-4 ${columns}`}>
        {visible.map(renderCard)}
      </div>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {expanded ? (
              <>Show Less <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>Load More ({remaining} remaining) <ChevronDown className="h-4 w-4" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Draggable Azure section wrapper ---
function AzureSection({
  id,
  title,
  count,
  children,
  defaultCollapsed = false,
}: {
  id: string;
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-transparent transition-all",
        isDragging && "opacity-50 border-primary/30 bg-accent/30 shadow-lg z-50"
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing rounded p-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <h3 className="text-lg font-semibold">{title}</h3>
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {collapsed ? (
              <>Expand <ChevronDown className="h-3.5 w-3.5" /></>
            ) : (
              <>Collapse <ChevronUp className="h-3.5 w-3.5" /></>
            )}
          </button>
        </div>
      </div>
      {!collapsed && children}
      {collapsed && (
        <div className="rounded-lg border border-dashed border-border py-3 text-center">
          <p className="text-xs text-muted-foreground">{title} section collapsed</p>
        </div>
      )}
    </div>
  );
}

// --- Resource Group drill-down ---
function ResourceGroupDrillDown() {
  const { data: rgData, isLoading: rgLoading } = useAzureResourceGroups();
  const [selectedRg, setSelectedRg] = useState<string | null>(null);
  const { data: rgResources, isLoading: resourcesLoading } = useAzureResourceGroupResources(selectedRg);

  const resourceGroups = rgData?.resourceGroups || [];

  if (selectedRg) {
    const resources = rgResources?.resources || [];
    const selectedRgData = resourceGroups.find((rg) => rg.name === selectedRg);
    return (
      <div>
        <button
          onClick={() => setSelectedRg(null)}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resource Groups
        </button>
        <div className="mb-4 flex items-center gap-2">
          <Folder className="h-5 w-5 text-primary" />
          <h4 className="text-base font-semibold">{selectedRg}</h4>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {resources.length} resources
          </span>
          {selectedRgData?.id && (
            <a
              href={`https://portal.azure.com/#@/resource${selectedRgData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Open in Portal <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {resourcesLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading resources...</span>
          </div>
        ) : resources.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No visible resources in this group</p>
          </div>
        ) : (
          <CardGrid
            items={resources.map((r) => ({ ...r, _sortKey: r.name }))}
            renderCard={(resource) => (
              <a
                key={resource.id}
                href={`https://portal.azure.com/#@/resource${resource.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <span className="text-xl">{resource.icon}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{resource.location}</Badge>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">{resource.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{resource.azureType.split("/").pop()}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs font-normal">{resource.type}</Badge>
                      {resource.kind && (
                        <Badge variant="outline" className="text-xs font-normal">{resource.kind}</Badge>
                      )}
                      {resource.sku && (
                        <Badge variant="outline" className="text-xs font-normal">{resource.sku}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </a>
            )}
          />
        )}
      </div>
    );
  }

  if (rgLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading resource groups...</span>
      </div>
    );
  }

  if (resourceGroups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">No resource groups visible. Try signing in with Microsoft OAuth for full access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {resourceGroups.map((rg) => (
        <button
          key={rg.id}
          onClick={() => setSelectedRg(rg.name)}
          className="flex w-full items-center justify-between rounded-lg border border-border p-4 text-left hover:bg-accent hover:border-primary/20 transition-all group"
        >
          <div className="flex items-center gap-3">
            <Folder className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <div>
              <p className="text-sm font-medium">{rg.name}</p>
              <p className="text-xs text-muted-foreground">{rg.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-xs ${rg.provisioningState === "Succeeded" ? "text-emerald-500" : "text-muted-foreground"}`}>
              <span className={`h-2 w-2 rounded-full ${rg.provisioningState === "Succeeded" ? "bg-emerald-500" : "bg-gray-400"}`} />
              {rg.provisioningState}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </button>
      ))}
    </div>
  );
}

// --- Main Azure View ---
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

  const azureModels = (allModels || []).filter((m) => m.provider === "Azure");
  const azureAgents = (agents || []).filter((a) => a.provider === "azure-foundry");
  const azureInfra = (infra || []).filter((r) => r.provider === "azure");

  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_ORDER);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = [...parsed];
        for (const id of DEFAULT_ORDER) {
          if (!merged.includes(id)) merged.push(id);
        }
        setSectionOrder(merged);
      }
    } catch {}
    setMounted(true);
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

  const sectionContent: Record<string, React.ReactNode> = {
    subscriptions: subscriptions.length > 0 ? (
      <AzureSection id="subscriptions" title="Subscriptions" count={subscriptions.length}>
        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <div key={sub.subscriptionId} className="flex items-center justify-between rounded-lg border border-border p-4">
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
      </AzureSection>
    ) : null,

    "resource-summary": resourceSummary && resourceSummary.total > 0 ? (
      <AzureSection id="resource-summary" title="Resource Summary">
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
      </AzureSection>
    ) : null,

    "resource-groups": (
      <AzureSection id="resource-groups" title="Resource Groups">
        <ResourceGroupDrillDown />
      </AzureSection>
    ),

    "ai-services": aiServices.length > 0 ? (
      <AzureSection id="ai-services" title="AI Services & Foundry" count={aiServices.length}>
        <CardGrid
          items={aiServices.map((svc) => ({ ...svc, _sortKey: svc.name }))}
          renderCard={(svc) => (
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
                    <p className="text-xs text-muted-foreground/70 font-mono truncate">{svc.endpoint}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        />
      </AzureSection>
    ) : null,

    agents: azureAgents.length > 0 ? (
      <AzureSection id="agents" title="Foundry Agents" count={azureAgents.length}>
        <CardGrid
          items={azureAgents.map((a) => ({ ...a, _sortKey: a.name }))}
          renderCard={(agent) => (
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
          )}
        />
      </AzureSection>
    ) : null,

    models: azureModels.length > 0 ? (
      <AzureSection id="models" title="Model Deployments" count={azureModels.length}>
        <CardGrid
          items={azureModels.map((m) => ({ ...m, _sortKey: m.name }))}
          renderCard={(model) => (
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
                    <Badge key={cap} variant="outline" className="text-xs font-normal capitalize">{cap}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        />
      </AzureSection>
    ) : null,

    resources: azureInfra.length > 0 ? (
      <AzureSection id="resources" title="All Resources" count={azureInfra.length}>
        <CardGrid
          items={azureInfra.map((r) => ({ ...r, _sortKey: r.name }))}
          renderCard={(resource) => (
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
                        <Badge key={key} variant="outline" className="text-xs font-normal">{val || key}</Badge>
                      ))}
                </div>
              </CardContent>
            </Card>
          )}
        />
      </AzureSection>
    ) : null,
  };

  // Filter out empty sections
  const activeSections = sectionOrder.filter((id) => sectionContent[id] != null);

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
        {azureOAuthAvailable && (
          <button
            onClick={() => signIn("microsoft-entra-id")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            {discovery?.tokenSource === "oauth" ? "Refresh Token" : "Sign in with Microsoft"}
          </button>
        )}
      </div>

      {/* Draggable sections */}
      {mounted ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeSections} strategy={verticalListSortingStrategy}>
            <div className="space-y-8">
              {activeSections.map((id) => (
                <div key={id}>{sectionContent[id]}</div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-8">
          {activeSections.map((id) => (
            <div key={id}>{sectionContent[id]}</div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {discoveryLoading && azureInfra.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">Discovering Azure resources...</p>
        </div>
      )}
    </div>
  );
}
