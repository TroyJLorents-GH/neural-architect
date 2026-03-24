"use client";

import { useState } from "react";
import { ArrowDownAZ, ArrowUpZA, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InfraResource } from "@/lib/types";

const typeIcons: Record<InfraResource["type"], string> = {
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
};

const providerLabels: Record<string, string> = {
  azure: "Azure",
  aws: "AWS",
  gcp: "GCP",
  vercel: "Vercel",
  netlify: "Netlify",
};

interface VercelData {
  projects: unknown[];
  deployments: unknown[];
  connected: boolean;
}

interface InfraCardsProps {
  resources: InfraResource[];
  vercelData?: VercelData;
  compact?: boolean;
  /** Number of items to show before "Load More" (default 6 = 2 rows of 3) */
  initialLimit?: number;
}

export function InfraCards({ resources, vercelData, compact, initialLimit = 6 }: InfraCardsProps) {
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState<"default" | "az" | "za">("default");

  if (resources.length === 0 && !vercelData?.connected) {
    return (
      <div>
        {!compact && <h2 className="mb-4 text-xl font-semibold">Infrastructure</h2>}
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No infrastructure connected yet. Add Azure, Vercel, or AWS credentials in your environment to see resources here.
          </p>
        </div>
      </div>
    );
  }

  const sorted = [...resources].sort((a, b) => {
    if (sort === "az") return a.name.localeCompare(b.name);
    if (sort === "za") return b.name.localeCompare(a.name);
    return 0;
  });

  const hasMore = sorted.length > initialLimit;
  const visible = expanded ? sorted : sorted.slice(0, initialLimit);
  const remaining = sorted.length - initialLimit;

  return (
    <div>
      {!compact && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Infrastructure</h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {resources.length} resources
            </span>
          </div>
          <SortToggle sort={sort} onSort={setSort} />
        </div>
      )}
      {compact && hasMore && (
        <div className="mb-3 flex justify-end">
          <SortToggle sort={sort} onSort={setSort} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((resource) => (
          <Card
            key={resource.id}
            className="group transition-all hover:shadow-md hover:border-primary/20"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <span className="text-xl">{typeIcons[resource.type]}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${statusColors[resource.status] || statusColors.unknown}`}
                  />
                  <span className="text-xs capitalize text-muted-foreground">
                    {resource.status}
                  </span>
                </div>
              </div>
              <CardTitle className="text-base font-semibold">
                {resource.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {providerLabels[resource.provider] || resource.provider} · {resource.region}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-xs font-normal">
                  {resource.type}
                </Badge>
                {resource.details &&
                  Object.entries(resource.details)
                    .filter(([, val]) => val)
                    .slice(0, 2)
                    .map(([key, val]) => (
                      <Badge
                        key={key}
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {val || key}
                      </Badge>
                    ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {expanded ? (
              <>
                Show Less <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Load More ({remaining} remaining) <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function SortToggle({
  sort,
  onSort,
}: {
  sort: "default" | "az" | "za";
  onSort: (s: "default" | "az" | "za") => void;
}) {
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
      {sort === "za" ? (
        <ArrowUpZA className="h-3.5 w-3.5" />
      ) : (
        <ArrowDownAZ className="h-3.5 w-3.5" />
      )}
      {sort !== "default" && <span>{sort === "az" ? "A-Z" : "Z-A"}</span>}
    </button>
  );
}
