import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    github: !!process.env.GITHUB_CLIENT_ID,
    // Service Principal (backend) — separate from user OAuth
    azureServicePrincipal: !!(
      process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET
    ),
    // Microsoft Entra ID OAuth available for user sign-in
    azureOAuthAvailable: !!(
      process.env.AZURE_AD_CLIENT_ID &&
      process.env.AZURE_AD_CLIENT_SECRET
    ),
    azureFoundry: !!(process.env.AZURE_FOUNDRY_ENDPOINTS),
    azureInfra: !!(process.env.AZURE_SUBSCRIPTION_ID),
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    ollama: true, // Always auto-detected, no key needed
    huggingface: !!process.env.HUGGINGFACE_TOKEN,
    vercel: !!process.env.VERCEL_TOKEN,
    aws: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    gitlab: !!(process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET),
    gcpOAuthAvailable: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
}
