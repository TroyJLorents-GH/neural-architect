import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Pipeline } from "@/lib/types";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Fetch all repos (paginate to get up to 100)
    const allRepos: { full_name: string; name: string }[] = [];
    let page = 1;
    while (page <= 3) {
      const reposRes = await fetch(
        `https://api.github.com/user/repos?sort=updated&per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (!reposRes.ok) {
        if (page === 1) {
          return NextResponse.json(
            { error: "Failed to fetch repos" },
            { status: reposRes.status }
          );
        }
        break;
      }

      const repos = await reposRes.json();
      if (repos.length === 0) break;
      allRepos.push(...repos);
      if (repos.length < 100) break;
      page++;
    }

    const pipelines: Pipeline[] = [];
    const reposToCheck = allRepos;

    await Promise.all(
      reposToCheck.map(
        async (repo: { full_name: string; name: string }) => {
          try {
            // First get the list of workflows defined in this repo
            const workflowsRes = await fetch(
              `https://api.github.com/repos/${repo.full_name}/actions/workflows`,
              {
                headers: {
                  Authorization: `Bearer ${session.accessToken}`,
                  Accept: "application/vnd.github+json",
                },
              }
            );

            if (!workflowsRes.ok) return;

            const workflowsData = await workflowsRes.json();
            const workflows = workflowsData.workflows || [];

            // For each workflow, get only the most recent run
            await Promise.all(
              workflows.map(
                async (wf: { id: number; name: string; path: string }) => {
                  try {
                    const runsRes = await fetch(
                      `https://api.github.com/repos/${repo.full_name}/actions/workflows/${wf.id}/runs?per_page=1`,
                      {
                        headers: {
                          Authorization: `Bearer ${session.accessToken}`,
                          Accept: "application/vnd.github+json",
                        },
                      }
                    );

                    if (!runsRes.ok) return;

                    const runsData = await runsRes.json();
                    const run = runsData.workflow_runs?.[0];
                    if (!run) return;

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

                    const startTime = new Date(
                      run.run_started_at || run.created_at
                    );
                    const endTime = run.updated_at
                      ? new Date(run.updated_at)
                      : new Date();
                    const duration = Math.round(
                      (endTime.getTime() - startTime.getTime()) / 1000
                    );

                    pipelines.push({
                      id: String(run.id),
                      name: wf.name,
                      repoName: repo.name,
                      status,
                      branch: run.head_branch,
                      duration,
                      triggeredAt: run.created_at,
                      provider: "github",
                    });
                  } catch {
                    // Skip workflows with errors
                  }
                }
              )
            );
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
