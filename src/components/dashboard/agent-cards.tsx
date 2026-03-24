"use client";

import {
  Bot,
  Code,
  Database,
  Workflow,
  MessageSquare,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AIAgent } from "@/lib/types";

const typeConfig = {
  research: { icon: MessageSquare, color: "text-blue-500", label: "Research" },
  code: { icon: Code, color: "text-emerald-500", label: "Code" },
  data: { icon: Database, color: "text-violet-500", label: "Data" },
  workflow: { icon: Workflow, color: "text-amber-500", label: "Workflow" },
  assistant: { icon: Bot, color: "text-cyan-500", label: "Assistant" },
  custom: { icon: Wrench, color: "text-rose-500", label: "Custom" },
};

const providerLabels: Record<string, string> = {
  "azure-foundry": "Azure Foundry",
  openai: "OpenAI",
  anthropic: "Anthropic",
  custom: "Custom",
};

const statusStyles = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
  error: "bg-red-500/10 text-red-500 border-red-500/20",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface AgentCardsProps {
  agents: AIAgent[];
  compact?: boolean;
}

export function AgentCards({ agents, compact }: AgentCardsProps) {
  return (
    <div>
      {!compact && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold">AI Agents</h2>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const typeInfo = typeConfig[agent.type];
          const TypeIcon = typeInfo.icon;
          return (
            <Card
              key={agent.id}
              className="group transition-all hover:shadow-md hover:border-primary/20"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent p-2">
                      <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {typeInfo.label}
                      </p>
                      <CardTitle className="text-base font-semibold">
                        {agent.name}
                      </CardTitle>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {providerLabels[agent.provider]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {agent.description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${statusStyles[agent.status]}`}
                  >
                    {agent.status}
                  </Badge>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{agent.invocationCount} calls</span>
                    <span>{timeAgo(agent.lastInvocation)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
