import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Pipeline } from "@/lib/types";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // First get the user's repos that have workflows
    const reposRes = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=10",
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!reposRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch repos" },
        { status: reposRes.status }
      );
    }

    const repos = await reposRes.json();
    const pipelines: Pipeline[] = [];

    // Fetch latest workflow runs for each repo (up to 5 repos to limit API calls)
    const reposToCheck = repos.slice(0, 5);

    await Promise.all(
      reposToCheck.map(
        async (repo: { full_name: string; name: string }) => {
          try {
            const runsRes = await fetch(
              `https://api.github.com/repos/${repo.full_name}/actions/runs?per_page=3`,
              {
                headers: {
                  Authorization: `Bearer ${session.accessToken}`,
                  Accept: "application/vnd.github+json",
                },
              }
            );

            if (!runsRes.ok) return;

            const runsData = await runsRes.json();

            for (const run of runsData.workflow_runs || []) {
              let status: Pipeline["status"] = "pending";
              if (run.status === "completed") {
                status =
                  run.conclusion === "success"
                    ? "success"
                    : run.conclusion === "cancelled"
                    ? "cancelled"
                    : "failure";
              } else if (run.status === "in_progress") {
                status = "running";
              }

              const startTime = new Date(run.run_started_at || run.created_at);
              const endTime = run.updated_at
                ? new Date(run.updated_at)
                : new Date();
              const duration = Math.round(
                (endTime.getTime() - startTime.getTime()) / 1000
              );

              pipelines.push({
                id: String(run.id),
                name: run.name || run.workflow_id,
                repoName: repo.name,
                status,
                branch: run.head_branch,
                duration,
                triggeredAt: run.created_at,
                provider: "github",
              });
            }
          } catch {
            // Skip repos with no workflows
          }
        }
      )
    );

    // Sort by most recent
    pipelines.sort(
      (a, b) =>
        new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );

    return NextResponse.json(pipelines);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch pipelines", details: String(error) },
      { status: 500 }
    );
  }
}
