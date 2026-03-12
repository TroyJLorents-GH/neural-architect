import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { azureFetch } from "@/lib/azure-client";
import type { AIModel } from "@/lib/types";

interface AzureDeployment {
  id: string;
  model: string;
  properties?: {
    model?: {
      name?: string;
      format?: string;
      version?: string;
    };
    provisioningState?: string;
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (
    !process.env.AZURE_TENANT_ID ||
    !process.env.AZURE_CLIENT_ID ||
    !process.env.AZURE_CLIENT_SECRET
  ) {
    return NextResponse.json(
      { error: "Azure not configured", models: [] },
      { status: 200 }
    );
  }

  const models: AIModel[] = [];

  const endpoints = (process.env.AZURE_FOUNDRY_ENDPOINTS || "")
    .split(",")
    .filter(Boolean);

  for (const endpoint of endpoints) {
    try {
      const res = await azureFetch(
        `${endpoint.trim()}/openai/deployments?api-version=2024-10-21`,
        { method: "GET" }
      );

      if (!res.ok) {
        console.error(
          `Failed to fetch models from ${endpoint}: ${res.status}`
        );
        continue;
      }

      const data = await res.json();
      const deployments: AzureDeployment[] = data.data || data.value || [];

      for (const dep of deployments) {
        const modelName =
          dep.properties?.model?.name || dep.model || dep.id;

        // Infer capabilities from model name
        const capabilities: string[] = ["chat"];
        const lower = modelName.toLowerCase();
        if (lower.includes("gpt-4") || lower.includes("gpt-5")) {
          capabilities.push("code", "analysis");
        }
        if (lower.includes("4o") || lower.includes("vision")) {
          capabilities.push("vision");
        }
        if (lower.includes("embedding")) {
          capabilities.length = 0;
          capabilities.push("embeddings");
        }

        models.push({
          id: dep.id,
          name: modelName,
          provider: "Azure",
          capabilities,
          description: `Azure OpenAI deployment (${
            dep.properties?.model?.version || "latest"
          })`,
        });
      }
    } catch (error) {
      console.error(`Error fetching models from ${endpoint}:`, error);
    }
  }

  return NextResponse.json(models);
}
