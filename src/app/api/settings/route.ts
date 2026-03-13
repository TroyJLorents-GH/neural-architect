import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    github: !!process.env.GITHUB_CLIENT_ID,
    azure: !!(
      process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET
    ),
    azureFoundry: !!(process.env.AZURE_FOUNDRY_ENDPOINTS),
    azureInfra: !!(process.env.AZURE_SUBSCRIPTION_ID),
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    ollama: true, // Always auto-detected, no key needed
    huggingface: !!process.env.HUGGINGFACE_TOKEN,
    vercel: !!process.env.VERCEL_TOKEN,
  });
}
