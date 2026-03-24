import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export interface InfraResource {
  id: string;
  name: string;
  type: "vm" | "app-service" | "function" | "container" | "database" | "storage" | "ai" | "other";
  provider: "azure" | "aws" | "gcp" | "vercel" | "netlify";
  status: "running" | "stopped" | "error" | "deploying" | "unknown";
  region: string;
  url?: string;
  details?: Record<string, string>;
}

function classifyAzureResource(azureType: string): InfraResource["type"] {
  const t = azureType.toLowerCase();
  if (t.includes("virtualmachines")) return "vm";
  if (t.includes("sites") || t.includes("staticsite")) return "app-service";
  if (t.includes("functions")) return "function";
  if (t.includes("containerapp") || t.includes("kubernetes")) return "container";
  if (t.includes("documentdb") || t.includes("sql") || t.includes("cosmos")) return "database";
  if (t.includes("storageaccounts")) return "storage";
  if (
    t.includes("cognitiveservices") ||
    t.includes("openai") ||
    t.includes("machinelearning") ||
    t.includes("search/searchservices")
  ) return "ai";
  return "other";
}

// Skip low-value Azure resource types that clutter the view
const SKIP_TYPES = new Set([
  "microsoft.alertsmanagement/smartdetectoralertrules",
  "microsoft.insights/actiongroups",
  "microsoft.insights/activitylogalerts",
  "microsoft.insights/components",
  "microsoft.insights/metricalerts",
  "microsoft.insights/webtests",
  "microsoft.portal/dashboards",
  "microsoft.operationalinsights/workspaces",
  "microsoft.operationsmanagement/solutions",
  "microsoft.network/networkwatchers",
]);

async function fetchAzureResources(token: string, subId: string, rgName?: string): Promise<InfraResource[]> {
  const resources: InfraResource[] = [];

  // Paginate through all resources
  let url = rgName
    ? `https://management.azure.com/subscriptions/${subId}/resourceGroups/${rgName}/resources?api-version=2021-04-01`
    : `https://management.azure.com/subscriptions/${subId}/resources?api-version=2021-04-01`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) break;

    const data = await res.json();
    for (const r of data.value || []) {
      const typeLower = (r.type || "").toLowerCase();

      // Skip monitoring/management noise
      if (SKIP_TYPES.has(typeLower)) continue;

      const type = classifyAzureResource(r.type);

      resources.push({
        id: r.id,
        name: r.name,
        type,
        provider: "azure",
        status: "running", // ARM doesn't tell us power state in list calls
        region: r.location || "unknown",
        details: {
          resourceType: r.type,
          kind: r.kind || "",
        },
      });
    }

    // Follow nextLink for pagination
    url = data.nextLink || null;
  }

  return resources;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const resources: InfraResource[] = [];

  // Prefer user's OAuth token (sees everything the user has access to)
  // Fall back to Service Principal (limited to its RBAC scope)
  let azureToken: string | null = null;
  let tokenSource = "none";

  if (session.azureAccessToken) {
    azureToken = session.azureAccessToken;
    tokenSource = "oauth";
  } else if (
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  ) {
    try {
      const { getAzureCredential } = await import("@/lib/azure-client");
      const cred = getAzureCredential();
      const result = await cred.getToken("https://management.azure.com/.default");
      if (result) {
        azureToken = result.token;
        tokenSource = "service-principal";
      }
    } catch (error) {
      console.error("Azure SP auth error:", error);
    }
  }

  if (azureToken && process.env.AZURE_SUBSCRIPTION_ID) {
    try {
      const azureResources = await fetchAzureResources(
        azureToken,
        process.env.AZURE_SUBSCRIPTION_ID,
        process.env.AZURE_RESOURCE_GROUP
      );
      resources.push(...azureResources);
    } catch (error) {
      console.error("Azure infra error:", error);
    }
  }

  // Vercel projects as infrastructure
  if (process.env.VERCEL_TOKEN) {
    try {
      const res = await fetch("https://api.vercel.com/v9/projects?limit=20", {
        headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        for (const p of data.projects || []) {
          resources.push({
            id: p.id,
            name: p.name,
            type: "app-service",
            provider: "vercel",
            status: "running",
            region: "global (edge)",
            url: p.latestDeployments?.[0]?.url
              ? `https://${p.latestDeployments[0].url}`
              : undefined,
            details: {
              framework: p.framework || "unknown",
            },
          });
        }
      }
    } catch (error) {
      console.error("Vercel infra error:", error);
    }
  }

  return NextResponse.json(resources);
}
