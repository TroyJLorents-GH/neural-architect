"use client";

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
}

export function InfraCards({ resources, vercelData }: InfraCardsProps) {
  if (resources.length === 0 && !vercelData?.connected) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold">Infrastructure</h2>
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No infrastructure connected yet. Add Azure, Vercel, or AWS credentials in your environment to see resources here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Infrastructure</h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {resources.length} resources
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => (
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
    </div>
  );
}
