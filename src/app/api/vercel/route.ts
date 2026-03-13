import { NextResponse } from "next/server";

interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  latestDeployments?: {
    id: string;
    state: string;
    createdAt: number;
    url: string;
  }[];
  updatedAt: number;
  link?: {
    type: string;
    repo: string;
  };
}

interface VercelDeployment {
  uid: string;
  name: string;
  state: "READY" | "ERROR" | "BUILDING" | "QUEUED" | "CANCELED";
  url: string;
  created: number;
  meta?: {
    githubCommitMessage?: string;
    githubCommitRef?: string;
  };
}

export async function GET() {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    return NextResponse.json({
      projects: [],
      deployments: [],
      connected: false,
      error: "Vercel token not configured",
    });
  }

  try {
    const headers = { Authorization: `Bearer ${token}` };

    const [projectsRes, deploymentsRes] = await Promise.all([
      fetch("https://api.vercel.com/v9/projects?limit=20", {
        headers,
        signal: AbortSignal.timeout(5000),
      }),
      fetch("https://api.vercel.com/v6/deployments?limit=10", {
        headers,
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    const projectsData = projectsRes.ok ? await projectsRes.json() : { projects: [] };
    const deploymentsData = deploymentsRes.ok ? await deploymentsRes.json() : { deployments: [] };

    const projects = (projectsData.projects || []).map((p: VercelProject) => ({
      id: p.id,
      name: p.name,
      framework: p.framework,
      updatedAt: new Date(p.updatedAt).toISOString(),
      repo: p.link?.repo || null,
    }));

    const deployments = (deploymentsData.deployments || []).map((d: VercelDeployment) => ({
      id: d.uid,
      name: d.name,
      status: d.state.toLowerCase(),
      url: `https://${d.url}`,
      createdAt: new Date(d.created).toISOString(),
      commitMessage: d.meta?.githubCommitMessage || null,
      branch: d.meta?.githubCommitRef || null,
    }));

    return NextResponse.json({ projects, deployments, connected: true });
  } catch (error) {
    return NextResponse.json({
      projects: [],
      deployments: [],
      connected: false,
      error: String(error),
    });
  }
}
