import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

interface GcpProject {
  projectId: string;
  name: string;
  projectNumber: string;
  lifecycleState: string;
}

interface GcpResource {
  id: string;
  name: string;
  type: string;
  icon: string;
  service: string;
  project: string;
  region: string;
  status: string;
  details: Record<string, string>;
  consoleUrl: string;
}

async function gcpFetch(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  const session = await auth();

  if (!session?.gcpAccessToken) {
    return NextResponse.json({
      connected: false,
      projects: [],
      resources: [],
      error: "Google Cloud not connected",
    });
  }

  const token = session.gcpAccessToken;
  const resources: GcpResource[] = [];
  const errors: string[] = [];

  // Step 1: List projects
  let projects: GcpProject[] = [];
  try {
    const data = await gcpFetch(
      "https://cloudresourcemanager.googleapis.com/v1/projects?filter=lifecycleState%3DACTIVE",
      token
    );
    projects = data?.projects || [];
  } catch (e) {
    errors.push(`Projects: ${String(e)}`);
  }

  // Step 2: Fetch enabled APIs per project
  const enabledApis: Record<string, { name: string; title: string }[]> = {};
  await Promise.all(
    projects.map(async (proj) => {
      try {
        const data = await gcpFetch(
          `https://serviceusage.googleapis.com/v1/projects/${proj.projectId}/services?filter=state:ENABLED&pageSize=200`,
          token
        );
        enabledApis[proj.projectId] = (data?.services || []).map(
          (svc: { config?: { name?: string; title?: string } }) => ({
            name: String(svc.config?.name || ""),
            title: String(svc.config?.title || svc.config?.name || ""),
          })
        );
      } catch {
        enabledApis[proj.projectId] = [];
      }
    })
  );

  // Step 3: For each project, discover resources in parallel
  await Promise.all(
    projects.map(async (proj) => {
      const pid = proj.projectId;

      const fetches = await Promise.allSettled([
        // Compute Engine VMs
        (async () => {
          const data = await gcpFetch(
            `https://compute.googleapis.com/compute/v1/projects/${pid}/aggregated/instances`,
            token
          );
          if (!data?.items) return;
          for (const [zone, val] of Object.entries(data.items)) {
            const instances = (val as { instances?: Record<string, unknown>[] }).instances || [];
            for (const inst of instances) {
              const zoneName = (zone as string).replace("zones/", "");
              resources.push({
                id: String(inst.id || ""),
                name: String(inst.name || "Unknown"),
                type: "vm",
                icon: "🖥️",
                service: "Compute Engine",
                project: pid,
                region: zoneName,
                status: String(inst.status || "unknown").toLowerCase(),
                details: {
                  machineType: String(inst.machineType || "").split("/").pop() || "",
                  zone: zoneName,
                },
                consoleUrl: `https://console.cloud.google.com/compute/instancesDetail/zones/${zoneName}/instances/${inst.name}?project=${pid}`,
              });
            }
          }
        })(),

        // Cloud Functions
        (async () => {
          const data = await gcpFetch(
            `https://cloudfunctions.googleapis.com/v2/projects/${pid}/locations/-/functions`,
            token
          );
          for (const fn of data?.functions || []) {
            const name = String(fn.name || "").split("/").pop() || "Unknown";
            const location = String(fn.name || "").split("/")[3] || "";
            resources.push({
              id: String(fn.name || ""),
              name,
              type: "function",
              icon: "⚡",
              service: "Cloud Functions",
              project: pid,
              region: location,
              status: String(fn.state || "unknown").toLowerCase(),
              details: {
                runtime: String(fn.buildConfig?.runtime || ""),
                entryPoint: String(fn.buildConfig?.entryPoint || ""),
              },
              consoleUrl: `https://console.cloud.google.com/functions/details/${location}/${name}?project=${pid}`,
            });
          }
        })(),

        // Cloud Run services
        (async () => {
          const data = await gcpFetch(
            `https://run.googleapis.com/v2/projects/${pid}/locations/-/services`,
            token
          );
          for (const svc of data?.services || []) {
            const name = String(svc.name || "").split("/").pop() || "Unknown";
            const location = String(svc.name || "").split("/")[3] || "";
            resources.push({
              id: String(svc.name || ""),
              name,
              type: "container",
              icon: "📦",
              service: "Cloud Run",
              project: pid,
              region: location,
              status: svc.conditions?.find((c: { type: string }) => c.type === "Ready")?.status === "True" ? "running" : "unknown",
              details: {
                url: String(svc.uri || ""),
                lastModified: String(svc.updateTime || ""),
              },
              consoleUrl: `https://console.cloud.google.com/run/detail/${location}/${name}?project=${pid}`,
            });
          }
        })(),

        // Cloud SQL instances
        (async () => {
          const data = await gcpFetch(
            `https://sqladmin.googleapis.com/v1/projects/${pid}/instances`,
            token
          );
          for (const db of data?.items || []) {
            resources.push({
              id: String(db.selfLink || db.name || ""),
              name: String(db.name || "Unknown"),
              type: "database",
              icon: "🗄️",
              service: "Cloud SQL",
              project: pid,
              region: String(db.region || ""),
              status: String(db.state || "unknown").toLowerCase(),
              details: {
                databaseVersion: String(db.databaseVersion || ""),
                tier: String(db.settings?.tier || ""),
                storage: `${db.settings?.dataDiskSizeGb || 0}GB`,
              },
              consoleUrl: `https://console.cloud.google.com/sql/instances/${db.name}/overview?project=${pid}`,
            });
          }
        })(),

        // Cloud Storage buckets
        (async () => {
          const data = await gcpFetch(
            `https://storage.googleapis.com/storage/v1/b?project=${pid}`,
            token
          );
          for (const bucket of data?.items || []) {
            resources.push({
              id: String(bucket.id || bucket.name || ""),
              name: String(bucket.name || "Unknown"),
              type: "storage",
              icon: "💾",
              service: "Cloud Storage",
              project: pid,
              region: String(bucket.location || "global"),
              status: "active",
              details: {
                storageClass: String(bucket.storageClass || ""),
                created: String(bucket.timeCreated || ""),
              },
              consoleUrl: `https://console.cloud.google.com/storage/browser/${bucket.name}?project=${pid}`,
            });
          }
        })(),
      ]);

      for (const result of fetches) {
        if (result.status === "rejected") {
          errors.push(`${pid}: ${String(result.reason)}`);
        }
      }
    })
  );

  return NextResponse.json({
    connected: true,
    projects: projects.map((p) => ({
      projectId: p.projectId,
      name: p.name,
      state: p.lifecycleState,
      enabledApis: enabledApis[p.projectId] || [],
    })),
    resources,
    summary: {
      total: resources.length,
      vms: resources.filter((r) => r.type === "vm").length,
      functions: resources.filter((r) => r.type === "function").length,
      containers: resources.filter((r) => r.type === "container").length,
      databases: resources.filter((r) => r.type === "database").length,
      storage: resources.filter((r) => r.type === "storage").length,
    },
    errors: errors.length > 0 ? errors : undefined,
  });
}
