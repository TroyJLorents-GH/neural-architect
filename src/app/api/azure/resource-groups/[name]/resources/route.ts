import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Skip low-value resource types
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

function classifyResource(azureType: string) {
  const t = azureType.toLowerCase();
  if (t.includes("virtualmachines")) return { type: "vm", icon: "🖥️" };
  if (t.includes("sites") || t.includes("staticsite")) return { type: "app-service", icon: "🌐" };
  if (t.includes("functions")) return { type: "function", icon: "⚡" };
  if (t.includes("containerapp") || t.includes("kubernetes")) return { type: "container", icon: "📦" };
  if (t.includes("documentdb") || t.includes("sql") || t.includes("cosmos")) return { type: "database", icon: "🗄️" };
  if (t.includes("storageaccounts")) return { type: "storage", icon: "💾" };
  if (t.includes("cognitiveservices") || t.includes("openai") || t.includes("machinelearning") || t.includes("search/searchservices")) return { type: "ai", icon: "🧠" };
  if (t.includes("network") || t.includes("publicipaddresses") || t.includes("loadbalancers")) return { type: "network", icon: "🌐" };
  if (t.includes("keyvault")) return { type: "security", icon: "🔐" };
  return { type: "other", icon: "●" };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: rgName } = await params;
  const session = await auth();

  let azureToken: string | null = null;

  if (session?.azureAccessToken) {
    azureToken = session.azureAccessToken;
  } else if (
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  ) {
    try {
      const { getAzureCredential } = await import("@/lib/azure-client");
      const cred = getAzureCredential();
      const result = await cred.getToken("https://management.azure.com/.default");
      if (result) azureToken = result.token;
    } catch {}
  }

  if (!azureToken || !process.env.AZURE_SUBSCRIPTION_ID) {
    return NextResponse.json({ resources: [], error: "No Azure credentials" });
  }

  const subId = process.env.AZURE_SUBSCRIPTION_ID;
  const headers = { Authorization: `Bearer ${azureToken}` };

  try {
    const resources: Record<string, unknown>[] = [];
    let url: string | null =
      `https://management.azure.com/subscriptions/${subId}/resourceGroups/${encodeURIComponent(rgName)}/resources?api-version=2021-04-01`;

    while (url) {
      const res: Response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
      if (!res.ok) break;
      const data: { value?: Record<string, unknown>[]; nextLink?: string } = await res.json();

      for (const r of data.value || []) {
        const rType = String(r.type || "");
        const typeLower = rType.toLowerCase();
        if (SKIP_TYPES.has(typeLower)) continue;

        const classification = classifyResource(rType);
        const sku = r.sku as { name?: string; tier?: string } | undefined;
        resources.push({
          id: r.id,
          name: r.name,
          azureType: rType,
          type: classification.type,
          icon: classification.icon,
          kind: r.kind || null,
          location: r.location,
          sku: sku ? `${sku.name || ""} ${sku.tier || ""}`.trim() : null,
          tags: r.tags || {},
        });
      }

      url = data.nextLink || null;
    }

    return NextResponse.json({ resources });
  } catch (error) {
    return NextResponse.json({ resources: [], error: String(error) });
  }
}
