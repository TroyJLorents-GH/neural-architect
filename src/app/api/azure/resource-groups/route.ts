import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  let azureToken: string | null = null;
  let tokenSource = "none";

  if (session?.azureAccessToken) {
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
    } catch {}
  }

  if (!azureToken || !process.env.AZURE_SUBSCRIPTION_ID) {
    return NextResponse.json({ resourceGroups: [], error: "No Azure credentials" });
  }

  const subId = process.env.AZURE_SUBSCRIPTION_ID;
  const headers = { Authorization: `Bearer ${azureToken}` };

  try {
    const res = await fetch(
      `https://management.azure.com/subscriptions/${subId}/resourcegroups?api-version=2021-04-01`,
      { headers, signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) {
      return NextResponse.json({ resourceGroups: [], error: `Azure API ${res.status}` });
    }

    const data = await res.json();
    const resourceGroups = (data.value || []).map((rg: Record<string, unknown>) => ({
      id: rg.id,
      name: rg.name,
      location: rg.location,
      provisioningState: (rg.properties as Record<string, unknown>)?.provisioningState || "Unknown",
      tags: rg.tags || {},
    }));

    return NextResponse.json({ resourceGroups, tokenSource });
  } catch (error) {
    return NextResponse.json({ resourceGroups: [], error: String(error) });
  }
}
