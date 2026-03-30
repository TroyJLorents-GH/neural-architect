"use client";

import { useState, useCallback, useEffect } from "react";
import { ArrowDownAZ, ArrowUpZA, ChevronDown, ChevronUp, GripVertical, ExternalLink, Loader2 } from "lucide-react";
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
import { useGcpDiscovery, useProviderStatus } from "@/lib/hooks";
import { signIn } from "next-auth/react";
import type { GcpResource } from "@/lib/gcp-types";

const STORAGE_KEY = "neural-architect-gcp-section-order";
const DEFAULT_ORDER = ["projects", "summary", "apis", "vms", "functions", "containers", "databases", "storage"];

const statusColors: Record<string, string> = {
  running: "bg-emerald-500",
  active: "bg-emerald-500",
  ready: "bg-emerald-500",
  terminated: "bg-red-500",
  stopped: "bg-gray-400",
  unknown: "bg-gray-400",
};

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
    >
      {sort === "za" ? <ArrowUpZA className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />}
      {sort !== "default" && <span>{sort === "az" ? "A-Z" : "Z-A"}</span>}
    </button>
  );
}

function CardGrid<T extends { _sortKey: string }>({
  items,
  initialLimit = 9,
  renderCard,
  columns = "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
}: {
  items: T[];
  initialLimit?: number;
  renderCard: (item: T) => React.ReactNode;
  columns?: string;
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
      {items.length > 1 && (
        <div className="mb-3 flex justify-end">
          <SortToggle sort={sort} onSort={setSort} />
        </div>
      )}
      <div className={`grid gap-4 ${columns}`}>{visible.map(renderCard)}</div>
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

function GcpSection({
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
  const style = { transform: CSS.Transform.toString(transform), transition };

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
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <h3 className="text-lg font-semibold">{title}</h3>
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{count}</span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {collapsed ? <>Expand <ChevronDown className="h-3.5 w-3.5" /></> : <>Collapse <ChevronUp className="h-3.5 w-3.5" /></>}
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

function ResourceCard({ resource }: { resource: GcpResource & { _sortKey: string } }) {
  return (
    <a key={resource.id} href={resource.consoleUrl} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <span className="text-xl">{resource.icon}</span>
            <div className="flex items-center gap-2">
              {resource.status && resource.status !== "active" && (
                <>
                  <span className={`h-2 w-2 rounded-full ${statusColors[resource.status] || "bg-gray-400"}`} />
                  <span className="text-xs capitalize text-muted-foreground">{resource.status}</span>
                </>
              )}
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">{resource.name}</CardTitle>
          <p className="text-xs text-muted-foreground">{resource.service} · {resource.project}</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {resource.region && (
              <Badge variant="secondary" className="text-xs">{resource.region}</Badge>
            )}
            {Object.entries(resource.details)
              .filter(([, v]) => v && !v.includes("1970") && v !== "undefined")
              .map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-xs font-normal">{v}</Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

export function GcpView() {
  const { data: gcp, isLoading } = useGcpDiscovery();
  const { data: providerStatus } = useProviderStatus();

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

  const gcpOAuth = !!providerStatus?.gcpOAuthAvailable;
  const isConnected = gcp?.connected;

  if (!gcpOAuth) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-4xl mb-4">◇</p>
        <h3 className="text-lg font-semibold mb-2">Connect to Google Cloud</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment to enable Google Cloud OAuth discovery.
        </p>
      </div>
    );
  }

  if (!isConnected && !isLoading) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-4xl mb-4">◇</p>
        <h3 className="text-lg font-semibold mb-2">Sign in with Google</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          Sign in with your Google account to auto-discover your GCP projects, VMs, Cloud Functions, Cloud Run, Cloud SQL, and Cloud Storage.
        </p>
        <button
          onClick={() => signIn("google")}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Discovering GCP resources...</span>
      </div>
    );
  }

  const resources = gcp?.resources || [];
  const projects = gcp?.projects || [];
  const summary = gcp?.summary;
  const vms = resources.filter((r) => r.type === "vm");
  const functions = resources.filter((r) => r.type === "function");
  const containers = resources.filter((r) => r.type === "container");
  const databases = resources.filter((r) => r.type === "database");
  const storage = resources.filter((r) => r.type === "storage");

  const sectionContent: Record<string, React.ReactNode> = {
    projects: projects.length > 0 ? (
      <GcpSection id="projects" title="Projects" count={projects.length}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((proj) => (
            <a key={proj.projectId} href={`https://console.cloud.google.com/home/dashboard?project=${proj.projectId}`} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="group transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{proj.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{proj.projectId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-xs ${proj.state === "ACTIVE" ? "text-emerald-500" : "text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${proj.state === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"}`} />
                        {proj.state}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </GcpSection>
    ) : null,

    summary: summary && summary.total > 0 ? (
      <GcpSection id="summary" title="Resource Summary">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "VMs", count: summary.vms, icon: "🖥️" },
            { label: "Functions", count: summary.functions, icon: "⚡" },
            { label: "Cloud Run", count: summary.containers, icon: "📦" },
            { label: "Databases", count: summary.databases, icon: "🗄️" },
            { label: "Storage", count: summary.storage, icon: "💾" },
            { label: "Total", count: summary.total, icon: "◇" },
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
      </GcpSection>
    ) : null,

    apis: projects.some((p) => p.enabledApis.length > 0) ? (
      <GcpSection id="apis" title="Enabled APIs" count={projects.reduce((sum, p) => sum + p.enabledApis.length, 0)} defaultCollapsed>
        <div className="space-y-4">
          {projects.filter((p) => p.enabledApis.length > 0).map((proj) => (
            <div key={proj.projectId}>
              <p className="text-sm font-medium mb-2">{proj.name} <span className="text-muted-foreground font-normal">({proj.enabledApis.length})</span></p>
              <div className="flex flex-wrap gap-1.5">
                {proj.enabledApis
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((api) => (
                    <a
                      key={api.name}
                      href={`https://console.cloud.google.com/apis/api/${api.name}/overview?project=${proj.projectId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="text-xs font-normal hover:bg-accent hover:text-foreground cursor-pointer transition-colors">
                        {api.title}
                      </Badge>
                    </a>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </GcpSection>
    ) : null,

    vms: vms.length > 0 ? (
      <GcpSection id="vms" title="Compute Engine VMs" count={vms.length}>
        <CardGrid
          items={vms.map((r) => ({ ...r, _sortKey: r.name }))}
          renderCard={(resource) => <ResourceCard key={resource.id} resource={resource} />}
        />
      </GcpSection>
    ) : null,

    functions: functions.length > 0 ? (
      <GcpSection id="functions" title="Cloud Functions" count={functions.length}>
        <CardGrid
          items={functions.map((r) => ({ ...r, _sortKey: r.name }))}
          renderCard={(resource) => <ResourceCard key={resource.id} resource={resource} />}
        />
      </GcpSection>
    ) : null,

    containers: containers.length > 0 ? (
      <GcpSection id="containers" title="Cloud Run Services" count={containers.length}>
        <CardGrid
          items={containers.map((r) => ({ ...r, _sortKey: r.name }))}
          renderCard={(resource) => <ResourceCard key={resource.id} resource={resource} />}
        />
      </GcpSection>
    ) : null,

    databases: databases.length > 0 ? (
      <GcpSection id="databases" title="Cloud SQL" count={databases.length}>
        <CardGrid
          items={databases.map((r) => ({ ...r, _sortKey: r.name }))}
          renderCard={(resource) => <ResourceCard key={resource.id} resource={resource} />}
        />
      </GcpSection>
    ) : null,

    storage: storage.length > 0 ? (
      <GcpSection id="storage" title="Cloud Storage" count={storage.length}>
        <CardGrid
          items={storage.map((r) => ({ ...r, _sortKey: r.name }))}
          renderCard={(resource) => <ResourceCard key={resource.id} resource={resource} />}
        />
      </GcpSection>
    ) : null,
  };

  const activeSections = sectionOrder.filter((id) => sectionContent[id] != null);

  return (
    <div className="space-y-8">
      {/* Connection banner */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">◇</span>
          <div>
            <p className="text-sm font-medium">Connected to Google Cloud</p>
            <p className="text-xs text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? "s" : ""} · {resources.length} resources discovered
            </p>
          </div>
        </div>
        <button
          onClick={() => signIn("google")}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          Refresh Token
        </button>
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

      {resources.length === 0 && !isLoading && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No resources found across your projects. Compute Engine VMs, Cloud Functions, Cloud Run, Cloud SQL, and Cloud Storage will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
