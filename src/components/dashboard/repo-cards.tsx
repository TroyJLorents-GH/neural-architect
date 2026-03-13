"use client";

import { useState } from "react";
import { Star, GitFork, CircleDot, Lock, ExternalLink, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "./sparkline";
import { RepoGridSkeleton } from "./skeletons";
import type { Repository } from "@/lib/types";

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  "C#": "#178600",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#b07219",
};

interface RepoCardsProps {
  repos: Repository[];
  loading?: boolean;
  initialLimit?: number;
}

export function RepoCards({ repos, loading, initialLimit = 6 }: RepoCardsProps) {
  const [showAll, setShowAll] = useState(false);

  // Sort by most recent commit activity (updatedAt)
  const sorted = [...repos].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const visible = showAll ? sorted : sorted.slice(0, initialLimit);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Repositories</h2>
        <span className="text-xs text-muted-foreground">
          {repos.length} repos
        </span>
      </div>
      {loading && <RepoGridSkeleton />}
      {!loading && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((repo) => (
          <a
            key={repo.id}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {repo.isPrivate && (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors truncate">
                      {repo.name}
                    </CardTitle>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0 ml-2">
                    {repo.provider}
                  </Badge>
                </div>
                {repo.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {repo.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sparkline */}
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Commits (90 days)
                  </p>
                  <Sparkline
                    data={repo.commitActivity}
                    color={
                      languageColors[repo.language || "TypeScript"] || "#6366f1"
                    }
                  />
                </div>

                {/* Languages */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(repo.languages)
                    .slice(0, 4)
                    .map(([lang, pct]) => (
                      <div key={lang} className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: languageColors[lang] || "#888",
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {lang} {pct}%
                        </span>
                      </div>
                    ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" /> {repo.starCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3.5 w-3.5" /> {repo.forkCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <CircleDot className="h-3.5 w-3.5" /> {repo.openIssues}
                  </span>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>}
      {!loading && !showAll && repos.length > initialLimit && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
            Load More ({repos.length - initialLimit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
