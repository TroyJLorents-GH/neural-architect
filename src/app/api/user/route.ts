import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  getUserProfile,
  upsertUserProfile,
  createDefaultProfile,
  type UserProfile,
} from "@/lib/cosmos";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Skip Cosmos if not configured — return a local-only profile
  if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY) {
    return NextResponse.json({
      id: session.user.email,
      userId: session.user.email,
      connectedProviders: {
        github: session.accessToken
          ? {
              username: session.user.name || "unknown",
              connectedAt: new Date().toISOString(),
            }
          : undefined,
      },
      preferences: { theme: "dark", defaultView: "dashboard" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies UserProfile);
  }

  try {
    let profile = await getUserProfile(session.user.email);
    if (!profile) {
      profile = await createDefaultProfile(
        session.user.email,
        session.user.name || undefined
      );
    }
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch profile", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY) {
    return NextResponse.json({ message: "Cosmos DB not configured, preferences saved locally only" });
  }

  try {
    const updates = await request.json();
    let profile = await getUserProfile(session.user.email);

    if (!profile) {
      profile = await createDefaultProfile(
        session.user.email,
        session.user.name || undefined
      );
    }

    // Merge preferences
    if (updates.preferences) {
      profile.preferences = { ...profile.preferences, ...updates.preferences };
    }

    // Merge connected providers
    if (updates.connectedProviders) {
      profile.connectedProviders = {
        ...profile.connectedProviders,
        ...updates.connectedProviders,
      };
    }

    const updated = await upsertUserProfile(profile);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update profile", details: String(error) },
      { status: 500 }
    );
  }
}
