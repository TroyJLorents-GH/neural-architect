"use client";

import { useState } from "react";
import { ArrowDownAZ, ArrowUpZA, ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiGooglecloud } from "react-icons/si";
import { FaAws, FaMicrosoft } from "react-icons/fa6";
import { useInfrastructure, useAwsDiscovery, useGcpDiscovery } from "@/lib/hooks";
import type { InfraResource } from "@/lib/types";

const typeIcons: Record<string, string> = {
  vm: "🖥️",
  "app-service": "🌐",
  function: "⚡",
  container: "📦",
  database: "🗄️",
  storage: "💾",
  ai: "🧠",
  network: "🔗",
  security: "🔒",
  other: "●",
};

const statusColors: Record<string, string> = {
  running: "bg-emerald-500",
  active: "bg-emerald-500",
  available: "bg-emerald-500",
  ready: "bg-emerald-500",
  stopped: "bg-gray-400",
  terminated: "bg-red-500",
  error: "bg-red-500",
  deploying: "bg-amber-500",
  unknown: "bg-gray-400",
};

interface UnifiedResource {
  id: string;
  name: string;
  type: string;
  icon: string;
  provider: "azure" | "aws" | "gcp";
  region: string;
  status: string;
  service: string;
  url?: string;
  details: Record<string, string>;
}

type SortMode = "default" | "az" | "za";
type FilterProvider = "all" | "azure" | "aws" | "gcp";

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

const providerIcon = (p: string) => {
  switch (p) {
    case "azure": return <FaMicrosoft className="h-3.5 w-3.5 text-[#00a4ef]" />;
    case "aws": return <FaAws className="h-3.5 w-3.5 text-[#ff9900]" />;
    case "gcp": return <SiGooglecloud className="h-3.5 w-3.5 text-[#4285f4]" />;
    default: return null;
  }
};

interface InfraCardsProps {
  resources?: InfraResource[];
  vercelData?: unknown;
  compact?: boolean;
  initialLimit?: number;
}

export function InfraCards({ compact, initialLimit = 9 }: InfraCardsProps) {
  const { data: azureResources, isLoading: azureLoading } = useInfrastructure();
  const { data: awsData, isLoading: awsLoading } = useAwsDiscovery();
  const { data: gcpData, isLoading: gcpLoading } = useGcpDiscovery();

  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState<SortMode>("default");
  const [filter, setFilter] = useState<FilterProvider>("all");

  const isLoading = azureLoading || awsLoading || gcpLoading;

  // Merge all resources into a unified list
  const unified: UnifiedResource[] = [];

  // Azure resources from infrastructure API
  if (azureResources) {
    for (const r of azureResources) {
      unified.push({
        id: r.id,
        name: r.name,
        type: r.type || "other",
        icon: typeIcons[r.type] || "●",
        provider: "azure",
        region: r.region,
        status: r.status,
        service: r.details?.azureType || r.type || "",
        url: r.url,
        details: r.details || {},
      });
    }
  }

  // AWS resources
  if (awsData?.resources) {
    for (const r of awsData.resources) {
      unified.push({
        id: r.id,
        name: r.name,
        type: r.type,
        icon: r.icon || typeIcons[r.type] || "●",
        provider: "aws",
        region: r.region,
        status: r.status || "active",
        service: r.service,
        url: r.consoleUrl,
        details: r.details || {},
      });
    }
  }

  // GCP resources
  if (gcpData?.resources) {
    for (const r of gcpData.resources) {
      unified.push({
        id: r.id,
        name: r.name,
        type: r.type,
        icon: r.icon || typeIcons[r.type] || "●",
        provider: "gcp",
        region: r.region,
        status: r.status || "active",
        service: r.service,
        url: r.consoleUrl,
        details: r.details || {},
      });
    }
  }

  // Filter
  const filtered = filter === "all" ? unified : unified.filter((r) => r.provider === filter);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "az") return a.name.localeCompare(b.name);
    if (sort === "za") return b.name.localeCompare(a.name);
    return 0;
  });

  const hasMore = sorted.length > initialLimit;
  const visible = expanded ? sorted : sorted.slice(0, initialLimit);
  const remaining = sorted.length - initialLimit;

  // Provider counts for filter tabs
  const azureCount = unified.filter((r) => r.provider === "azure").length;
  const awsCount = unified.filter((r) => r.provider === "aws").length;
  const gcpCount = unified.filter((r) => r.provider === "gcp").length;

  if (unified.length === 0 && !isLoading) {
    return (
      <div>
        {!compact && <h2 className="mb-4 text-xl font-semibold">Infrastructure</h2>}
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No cloud resources found. Connect Azure, AWS, or GCP to see all your infrastructure in one place.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Azure", count: azureCount, icon: <FaMicrosoft className="h-5 w-5 text-[#00a4ef]" />, loading: azureLoading },
              { label: "AWS", count: awsCount, icon: <FaAws className="h-5 w-5 text-[#ff9900]" />, loading: awsLoading },
              { label: "GCP", count: gcpCount, icon: <SiGooglecloud className="h-5 w-5 text-[#4285f4]" />, loading: gcpLoading },
              { label: "Total", count: unified.length, icon: <span className="text-lg">☁</span>, loading: isLoading },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  {item.icon}
                  <div>
                    <p className="text-2xl font-bold">{item.loading ? "..." : item.count}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filter tabs + sort */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All", count: unified.length },
                  { id: "azure", label: "Azure", count: azureCount },
                  { id: "aws", label: "AWS", count: awsCount },
                  { id: "gcp", label: "GCP", count: gcpCount },
                ] as const
              )
                .filter((t) => t.id === "all" || t.count > 0)
                .map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      filter === tab.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
            </div>
            <SortToggle sort={sort} onSort={setSort} />
          </div>
        </>
      )}

      {compact && sorted.length > 1 && (
        <div className="mb-3 flex justify-end">
          <SortToggle sort={sort} onSort={setSort} />
        </div>
      )}

      {isLoading && unified.length === 0 && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Discovering cloud resources...</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((resource) => {
          const card = (
            <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <span className="text-xl">{resource.icon}</span>
                  <div className="flex items-center gap-2">
                    {providerIcon(resource.provider)}
                    <span className={`h-2 w-2 rounded-full ${statusColors[resource.status] || "bg-gray-400"}`} />
                    <span className="text-xs capitalize text-muted-foreground">{resource.status}</span>
                    {resource.url && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                  {resource.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {resource.service} · {resource.region}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs font-normal">{resource.type}</Badge>
                  {Object.entries(resource.details)
                    .filter(([, v]) => v && v !== "undefined" && !v.includes("1970"))
                    .slice(0, 2)
                    .map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-xs font-normal">{v}</Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          );

          return resource.url ? (
            <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer" className="block">
              {card}
            </a>
          ) : (
            <div key={resource.id}>{card}</div>
          );
        })}
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
