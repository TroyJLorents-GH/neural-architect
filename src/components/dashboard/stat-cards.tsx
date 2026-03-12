"use client";

import { GitBranch, Workflow, Bot, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

interface StatCardsProps {
  stats: DashboardStats;
}

const statConfig = [
  {
    key: "totalRepos" as const,
    label: "Repositories",
    sublabel: "Total",
    icon: GitBranch,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    key: "activePipelines" as const,
    label: "Pipelines",
    sublabel: "Active",
    icon: Workflow,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    key: "deployedAgents" as const,
    label: "Agents",
    sublabel: "Deployed",
    icon: Bot,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    key: "availableModels" as const,
    label: "Models",
    sublabel: "Available",
    icon: Brain,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {statConfig.map((stat) => (
        <Card key={stat.key} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.sublabel}</p>
                <p className="mt-1 text-3xl font-bold">{stats[stat.key]}</p>
                <p className="mt-1 text-sm font-medium">{stat.label}</p>
              </div>
              <div className={`rounded-xl p-3 ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
