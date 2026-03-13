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

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const resources: InfraResource[] = [];

  // Azure resources via Azure Resource Manager
  if (
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET &&
    process.env.AZURE_SUBSCRIPTION_ID
  ) {
    try {
      const { getAzureCredential } = await import("@/lib/azure-client");
      const cred = getAzureCredential();
      const token = await cred.getToken("https://management.azure.com/.default");

      if (token) {
        const subId = process.env.AZURE_SUBSCRIPTION_ID;
        const rgName = process.env.AZURE_RESOURCE_GROUP;

        // If a specific resource group is set, query it; otherwise list all
        const url = rgName
          ? `https://management.azure.com/subscriptions/${subId}/resourceGroups/${rgName}/resources?api-version=2021-04-01`
          : `https://management.azure.com/subscriptions/${subId}/resources?api-version=2021-04-01&$top=50`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token.token}` },
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const data = await res.json();
          for (const r of data.value || []) {
            const typeLower = (r.type || "").toLowerCase();
            let type: InfraResource["type"] = "other";

            if (typeLower.includes("virtualmachines")) type = "vm";
            else if (typeLower.includes("sites")) type = "app-service";
            else if (typeLower.includes("functions")) type = "function";
            else if (typeLower.includes("containerapp") || typeLower.includes("kubernetes"))
              type = "container";
            else if (
              typeLower.includes("documentdb") ||
              typeLower.includes("sql") ||
              typeLower.includes("cosmos")
            )
              type = "database";
            else if (typeLower.includes("storage")) type = "storage";
            else if (
              typeLower.includes("cognitiveservices") ||
              typeLower.includes("openai") ||
              typeLower.includes("machinelearning")
            )
              type = "ai";

            resources.push({
              id: r.id,
              name: r.name,
              type,
              provider: "azure",
              status: "running",
              region: r.location || "unknown",
              details: {
                resourceType: r.type,
                kind: r.kind || "",
              },
            });
          }
        }
      }
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
