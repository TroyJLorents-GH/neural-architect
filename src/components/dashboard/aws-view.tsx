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
import { useAwsDiscovery, useProviderStatus } from "@/lib/hooks";

const STORAGE_KEY = "neural-architect-aws-section-order";
const DEFAULT_ORDER = ["summary", "functions", "vms", "storage", "databases"];

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500",
  active: "bg-emerald-500",
  running: "bg-emerald-500",
  available: "bg-emerald-500",
  stopped: "bg-gray-400",
  terminated: "bg-red-500",
  unknown: "bg-gray-400",
};

// --- Sort toggle ---
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

// --- Card grid with sort + expand ---
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

// --- Draggable section ---
function AwsSection({
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

// --- Main AWS View ---
export function AwsView() {
  const { data: aws, isLoading } = useAwsDiscovery();
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

  if (!providerStatus?.aws) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-4xl mb-4">◈</p>
        <h3 className="text-lg font-semibold mb-2">Connect to AWS</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to your environment to discover Lambda functions, EC2 instances, S3 buckets, and databases.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Discovering AWS resources...</span>
      </div>
    );
  }

  const resources = aws?.resources || [];
  const summary = aws?.summary;
  const functions = resources.filter((r) => r.type === "function");
  const vms = resources.filter((r) => r.type === "vm");
  const storage = resources.filter((r) => r.type === "storage");
  const databases = resources.filter((r) => r.type === "database");

  const sectionContent: Record<string, React.ReactNode> = {
    summary: summary && summary.total > 0 ? (
      <AwsSection id="summary" title="Resource Summary">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { label: "Lambda", count: summary.functions, icon: "⚡" },
            { label: "EC2", count: summary.vms, icon: "🖥️" },
            { label: "S3", count: summary.storage, icon: "💾" },
            { label: "Databases", count: summary.databases, icon: "🗄️" },
            { label: "Total", count: summary.total, icon: "◈" },
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
      </AwsSection>
    ) : null,

    functions: functions.length > 0 ? (
      <AwsSection id="functions" title="Lambda Functions" count={functions.length}>
        <CardGrid
          items={functions.map((r) => ({ ...r, _sortKey: r.name }))}
          renderCard={(resource) => (
            <a key={resource.id} href={resource.consoleUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xl">{resource.icon}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{resource.region}</Badge>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">{resource.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{resource.service}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(resource.details).filter(([, v]) => v && !v.includes("1970")).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-xs font-normal">{v}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </a>
          )}
        />
      </AwsSection>
    ) : null,

    vms: vms.length > 0 ? (
      <AwsSection id="vms" title="EC2 Instances" count={vms.length}>
        <CardGrid
          items={vms.map((r) => ({ ...r, _sortKey: r.name }))}
          renderCard={(resource) => (
            <a key={resource.id} href={resource.consoleUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xl">{resource.icon}</span>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${statusColors[resource.status] || "bg-gray-400"}`} />
                      <span className="text-xs capitalize text-muted-foreground">{resource.status}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">{resource.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{resource.service} · {resource.region}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(resource.details).filter(([, v]) => v && v !== "none").map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-xs font-normal">{v}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </a>
          )}
        />
      </AwsSection>
    ) : null,

    storage: storage.length > 0 ? (
      <AwsSection id="storage" title="S3 Buckets" count={storage.length}>
        <CardGrid
          items={storage.map((r) => ({ ...r, _sortKey: r.name }))}
          renderCard={(resource) => (
            <a key={resource.id} href={resource.consoleUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xl">{resource.icon}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">{resource.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{resource.service}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs font-normal">global</Badge>
                    {resource.details.created && (
                      <Badge variant="outline" className="text-xs font-normal">
                        Created {new Date(resource.details.created).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </a>
          )}
        />
      </AwsSection>
    ) : null,

    databases: databases.length > 0 ? (
      <AwsSection id="databases" title="Databases" count={databases.length}>
        <CardGrid
          items={databases.map((r) => ({ ...r, _sortKey: r.name }))}
          renderCard={(resource) => (
            <a key={resource.id} href={resource.consoleUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xl">{resource.icon}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{resource.service}</Badge>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">{resource.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{resource.region}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(resource.details).filter(([, v]) => v).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-xs font-normal">{v}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </a>
          )}
        />
      </AwsSection>
    ) : null,
  };

  const activeSections = sectionOrder.filter((id) => sectionContent[id] != null);

  return (
    <div className="space-y-8">
      {/* Connection banner */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">◈</span>
          <div>
            <p className="text-sm font-medium">Connected to AWS</p>
            <p className="text-xs text-muted-foreground">
              Region: {aws?.region} · {resources.length} resources discovered
            </p>
          </div>
        </div>
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
            No resources found in {aws?.region}. Your Lambda, EC2, S3, DynamoDB, and RDS resources will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
