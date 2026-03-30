import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Pipeline } from "@/lib/types";

interface GitLabPipeline {
  id: number;
  status: string;
  ref: string;
  created_at: string;
  updated_at: string;
  duration: number | null;
  web_url: string;
}

interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
}

function mapStatus(
  glStatus: string
): Pipeline["status"] {
  switch (glStatus) {
    case "success":
      return "success";
    case "failed":
      return "failure";
    case "running":
    case "pending":
      return glStatus as Pipeline["status"];
    case "canceled":
    case "skipped":
      return "cancelled";
    default:
      return "pending";
  }
}

export async function GET() {
  const session = await auth();

  if (!session?.gitlabAccessToken) {
    return NextResponse.json({ error: "GitLab not connected" }, { status: 401 });
  }

  try {
    // Get user's owned projects
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

    // Fetch recent pipelines for each project in parallel
    const allPipelines: Pipeline[] = [];

    await Promise.all(
      projects.map(async (proj) => {
        try {
          const pipRes = await fetch(
            `https://gitlab.com/api/v4/projects/${proj.id}/pipelines?per_page=10&order_by=updated_at&sort=desc`,
            { headers: { Authorization: `Bearer ${session.gitlabAccessToken}` } }
          );
          if (!pipRes.ok) return;

          const pipelines: GitLabPipeline[] = await pipRes.json();

          for (const pip of pipelines) {
            allPipelines.push({
              id: String(pip.id),
              name: `Pipeline #${pip.id}`,
              repoName: proj.path_with_namespace,
              status: mapStatus(pip.status),
              branch: pip.ref,
              duration: pip.duration || 0,
              triggeredAt: pip.created_at,
              provider: "gitlab" as const,
            });
          }
        } catch {}
      })
    );

    // Sort by most recent
    allPipelines.sort(
      (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );

    return NextResponse.json(allPipelines);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch GitLab pipelines", details: String(error) },
      { status: 500 }
    );
  }
}
