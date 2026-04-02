import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// Called after sign-in to link the provider account to an invite token
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { invite_token } = await request.json();
    if (!invite_token) {
      return NextResponse.json({ error: "No invite token" }, { status: 400 });
    }

    // Verify the token is valid
    const { data: waitlistEntry, error: findError } = await getSupabase()
      .from("waitlist")
      .select("id, status")
      .eq("invite_token", invite_token)
      .eq("status", "approved")
      .single();

    if (findError || !waitlistEntry) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 400 });
    }

    // Use the user's email + a provider hint as the account identifier
    // NextAuth session gives us the user info from whichever provider they used
    const userEmail = session.user.email || "";
    const userName = session.user.name || "";

    // Insert into approved_accounts (upsert to handle re-links)
    const { error: insertError } = await getSupabase()
      .from("approved_accounts")
      .upsert(
        {
          invite_token,
          provider: "oauth",
          provider_account_id: userEmail || userName,
          email: userEmail,
        },
        { onConflict: "provider,provider_account_id" }
      );

    if (insertError) throw insertError;

    return NextResponse.json({ linked: true });
  } catch (error) {
    console.error("Link invite error:", error);
    return NextResponse.json(
      { error: "Failed to link account", details: String(error) },
      { status: 500 }
    );
  }
}
