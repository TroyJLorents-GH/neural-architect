import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Repository } from "@/lib/types";

const WEEKS = 12;

function buildCommitActivity(
  commits: { committed_date: string }[] | undefined
): number[] {
  const bins = new Array(WEEKS).fill(0);
  if (!commits || commits.length === 0) return bins;
  const now = new Date();
  for (const commit of commits) {
    const date = new Date(commit.committed_date);
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex >= 0 && weekIndex < WEEKS) {
      bins[WEEKS - 1 - weekIndex]++;
    }
  }
  return bins;
}

interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  description: string | null;
  web_url: string;
  visibility: string;
  default_branch: string;
  star_count: number;
  forks_count: number;
  open_issues_count: number;
  last_activity_at: string;
  languages?: Record<string, number>;
}

export async function GET() {
  const session = await auth();

  if (!session?.gitlabAccessToken) {
    return NextResponse.json({ error: "GitLab not connected" }, { status: 401 });
  }

  try {
    // Fetch projects owned by user
    const projRes = await fetch(
      "https://gitlab.com/api/v4/projects?membership=true&owned=true&per_page=50&order_by=updated_at",
      {
        headers: { Authorization: `Bearer ${session.gitlabAccessToken}` },
      }
    );

    if (!projRes.ok) {
      return NextResponse.json(
        { error: "GitLab API error", details: await projRes.text() },
        { status: projRes.status }
      );
    }

    const projects: GitLabProject[] = await projRes.json();

    // Fetch languages and recent commits for each project in parallel
    const repos: Repository[] = await Promise.all(
      projects.map(async (proj) => {
        // Languages
        let languages: Record<string, number> = {};
        try {
          const langRes = await fetch(
            `https://gitlab.com/api/v4/projects/${proj.id}/languages`,
            { headers: { Authorization: `Bearer ${session.gitlabAccessToken}` } }
          );
          if (langRes.ok) {
            languages = await langRes.json();
          }
        } catch {}

        // Recent commits (last 90 days)
        let commitActivity: number[] = new Array(WEEKS).fill(0);
        try {
          const since = new Date(Date.now() - WEEKS * 7 * 24 * 60 * 60 * 1000).toISOString();
          const commitRes = await fetch(
            `https://gitlab.com/api/v4/projects/${proj.id}/repository/commits?per_page=100&since=${since}`,
            { headers: { Authorization: `Bearer ${session.gitlabAccessToken}` } }
          );
          if (commitRes.ok) {
            const commits = await commitRes.json();
            commitActivity = buildCommitActivity(commits);
          }
        } catch {}

        const primaryLanguage = Object.keys(languages)[0] || null;

        return {
          id: String(proj.id),
          name: proj.name,
          fullName: proj.path_with_namespace,
          description: proj.description,
          language: primaryLanguage,
          languages,
          starCount: proj.star_count,
          forkCount: proj.forks_count,
          openIssues: proj.open_issues_count || 0,
          updatedAt: proj.last_activity_at,
          url: proj.web_url,
          isPrivate: proj.visibility === "private",
          defaultBranch: proj.default_branch || "main",
          commitActivity,
          provider: "gitlab" as const,
        };
      })
    );

    return NextResponse.json(repos);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch GitLab repos", details: String(error) },
      { status: 500 }
    );
  }
}
