"use client";

import { Star, GitFork, CircleDot, Lock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "./sparkline";
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
}

export function RepoCards({ repos }: RepoCardsProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Repositories</h2>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          View All <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {repos.map((repo) => (
          <Card
            key={repo.id}
            className="group transition-all hover:shadow-md hover:border-primary/20"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {repo.isPrivate && (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                    {repo.name}
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-xs capitalize">
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
                  Commits (7 days)
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
                        className="h-2.5 w-2.5 rounded-full"
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
        ))}
      </div>
    </div>
  );
}
