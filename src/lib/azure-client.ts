import { ClientSecretCredential } from "@azure/identity";

let credential: ClientSecretCredential | null = null;

export function getAzureCredential(): ClientSecretCredential {
  if (!credential) {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error(
        "AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET must be set"
      );
    }

    credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  }
  return credential;
}

export async function getAzureToken(): Promise<string> {
  const cred = getAzureCredential();
  const token = await cred.getToken("https://ai.azure.com/.default");
  if (!token) throw new Error("Failed to get Azure token");
  return token.token;
}

/**
 * Fetch from an Azure AI Foundry endpoint with Service Principal auth
 */
export async function azureFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAzureToken();
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}
