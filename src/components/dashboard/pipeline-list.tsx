"use client";

import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Ban,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PipelineListSkeleton } from "./skeletons";
import { Badge } from "@/components/ui/badge";
import type { Pipeline } from "@/lib/types";

const statusConfig = {
  success: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "Success",
  },
  failure: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "Failed",
  },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Running",
  },
  pending: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Pending",
  },
  cancelled: {
    icon: Ban,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Cancelled",
  },
};

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface PipelineListProps {
  pipelines: Pipeline[];
  loading?: boolean;
  compact?: boolean;
}

export function PipelineList({ pipelines, loading, compact }: PipelineListProps) {
  return (
    <div>
      {!compact && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pipelines</h2>
          <span className="text-xs text-muted-foreground">
            {pipelines.length} runs
          </span>
        </div>
      )}
      {loading && <PipelineListSkeleton />}
      {!loading && <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {pipelines.map((pipeline) => {
              const config = statusConfig[pipeline.status];
              const StatusIcon = config.icon;
              return (
                <div
                  key={pipeline.id}
                  className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${config.bg}`}>
                      <StatusIcon
                        className={`h-4 w-4 ${config.color} ${
                          pipeline.status === "running" ? "animate-spin" : ""
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{pipeline.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pipeline.repoName}{" "}
                        <span className="mx-1 text-border">|</span>
                        {pipeline.branch}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4">
                    <Badge
                      variant="outline"
                      className={`text-xs ${config.color}`}
                    >
                      {config.label}
                    </Badge>
                    <span className="hidden sm:inline text-xs text-muted-foreground w-14 text-right">
                      {formatDuration(pipeline.duration)}
                    </span>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {timeAgo(pipeline.triggeredAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}
