import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface AzureSubscription {
  subscriptionId: string;
  displayName: string;
  state: string;
}

interface AzureResourceGroup {
  id: string;
  name: string;
  location: string;
}

interface AzureResource {
  id: string;
  name: string;
  type: string;
  location: string;
  kind?: string;
  properties?: Record<string, unknown>;
}

// Discover Azure resources using the user's OAuth token
export async function GET() {
  const session = await auth();

  // First try user's OAuth token, then fall back to Service Principal
  let azureToken = session?.azureAccessToken;
  let tokenSource: "oauth" | "service-principal" | "none" = "none";

  if (azureToken) {
    tokenSource = "oauth";
  } else if (
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  ) {
    // Fall back to Service Principal
    try {
      const { getAzureCredential } = await import("@/lib/azure-client");
      const cred = getAzureCredential();
      const tokenResult = await cred.getToken(
        "https://management.azure.com/.default"
      );
      if (tokenResult) {
        azureToken = tokenResult.token;
        tokenSource = "service-principal";
      }
    } catch (error) {
      console.error("Service principal auth failed:", error);
    }
  }

  if (!azureToken) {
    return NextResponse.json({
      connected: false,
      tokenSource: "none",
      subscriptions: [],
      resources: [],
      aiServices: [],
      error: "No Azure credentials available. Sign in with Microsoft or configure Service Principal.",
    });
  }

  const headers = {
    Authorization: `Bearer ${azureToken}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Discover subscriptions
    const subsRes = await fetch(
      "https://management.azure.com/subscriptions?api-version=2022-12-01",
      { headers, signal: AbortSignal.timeout(10000) }
    );

    if (!subsRes.ok) {
      const errorText = await subsRes.text();
      return NextResponse.json({
        connected: false,
        tokenSource,
        error: `Azure API error ${subsRes.status}: ${errorText}`,
        subscriptions: [],
        resources: [],
        aiServices: [],
      });
    }

    const subsData = await subsRes.json();
    const subscriptions: AzureSubscription[] = (subsData.value || []).map(
      (s: { subscriptionId: string; displayName: string; state: string }) => ({
        subscriptionId: s.subscriptionId,
        displayName: s.displayName,
        state: s.state,
      })
    );

    // 2. For each subscription, discover AI/ML services and Foundry endpoints
    const allResources: AzureResource[] = [];
    const aiServices: {
      id: string;
      name: string;
      type: string;
      endpoint?: string;
      location: string;
      subscription: string;
    }[] = [];

    for (const sub of subscriptions.filter((s) => s.state === "Enabled")) {
      try {
        // Get all resources (filtered to AI-relevant types)
        const resUrl = `https://management.azure.com/subscriptions/${sub.subscriptionId}/resources?api-version=2021-04-01&$top=100`;
        const resRes = await fetch(resUrl, {
          headers,
          signal: AbortSignal.timeout(10000),
        });

        if (!resRes.ok) continue;

        const resData = await resRes.json();
        for (const r of resData.value || []) {
          allResources.push(r);

          const typeLower = (r.type || "").toLowerCase();
          // Detect AI/ML resources that could be Foundry endpoints
          if (
            typeLower.includes("cognitiveservices") ||
            typeLower.includes("machinelearning") ||
            typeLower.includes("openai")
          ) {
            // Try to get the endpoint for this resource
            let endpoint: string | undefined;
            try {
              const detailRes = await fetch(
                `https://management.azure.com${r.id}?api-version=2023-05-01`,
                { headers, signal: AbortSignal.timeout(5000) }
              );
              if (detailRes.ok) {
                const detail = await detailRes.json();
                endpoint =
                  detail.properties?.endpoint ||
                  detail.properties?.endpoints?.["OpenAI Language Model Instance API"] ||
                  detail.properties?.endpoints?.default;
              }
            } catch {
              // Endpoint discovery optional
            }

            aiServices.push({
              id: r.id,
              name: r.name,
              type: r.type,
              endpoint,
              location: r.location,
              subscription: sub.displayName,
            });
          }
        }
      } catch (error) {
        console.error(`Error discovering resources in ${sub.displayName}:`, error);
      }
    }

    // 3. Categorize resources
    const resourceSummary = {
      total: allResources.length,
      vms: allResources.filter((r) =>
        r.type?.toLowerCase().includes("virtualmachines")
      ).length,
      appServices: allResources.filter((r) =>
        r.type?.toLowerCase().includes("sites")
      ).length,
      databases: allResources.filter(
        (r) =>
          r.type?.toLowerCase().includes("sql") ||
          r.type?.toLowerCase().includes("cosmos") ||
          r.type?.toLowerCase().includes("documentdb")
      ).length,
      containers: allResources.filter(
        (r) =>
          r.type?.toLowerCase().includes("containerapp") ||
          r.type?.toLowerCase().includes("kubernetes")
      ).length,
      ai: aiServices.length,
      storage: allResources.filter((r) =>
        r.type?.toLowerCase().includes("storage")
      ).length,
    };

    return NextResponse.json({
      connected: true,
      tokenSource,
      subscriptions,
      resourceSummary,
      aiServices,
      foundryEndpoints: aiServices
        .filter((s) => s.endpoint)
        .map((s) => ({
          name: s.name,
          endpoint: s.endpoint,
          location: s.location,
        })),
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      tokenSource,
      error: String(error),
      subscriptions: [],
      resources: [],
      aiServices: [],
    });
  }
}
