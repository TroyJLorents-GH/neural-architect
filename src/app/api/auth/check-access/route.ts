import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// Check if the current user has been approved via an invite
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ approved: false, reason: "not_authenticated" });
    }

    const userEmail = session.user.email || "";
    const userName = session.user.name || "";
    const identifier = userEmail || userName;

    // Owner bypass — check email AND username against owner list
    const ownerIds = (process.env.OWNER_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (
      (userEmail && ownerIds.includes(userEmail.toLowerCase())) ||
      (userName && ownerIds.includes(userName.toLowerCase()))
    ) {
      return NextResponse.json({ approved: true });
    }

    if (!identifier) {
      return NextResponse.json({ approved: false, reason: "no_identifier" });
    }

    // Check approved_accounts table
    const { data } = await getSupabase()
      .from("approved_accounts")
      .select("id")
      .eq("provider_account_id", identifier)
      .limit(1)
      .single();

    if (data) {
      return NextResponse.json({ approved: true });
    }

    // Also check if their email is directly approved on the waitlist
    // (covers the case where admin approved them but they haven't linked yet)
    if (userEmail) {
      const { data: waitlistEntry } = await getSupabase()
        .from("waitlist")
        .select("id, status, invite_token")
        .eq("email", userEmail.toLowerCase())
        .eq("status", "approved")
        .single();

      if (waitlistEntry) {
        // Auto-link their account since their email matches
        await getSupabase()
          .from("approved_accounts")
          .upsert(
            {
              invite_token: waitlistEntry.invite_token,
              provider: "oauth",
              provider_account_id: identifier,
              email: userEmail,
            },
            { onConflict: "provider,provider_account_id" }
          );

        return NextResponse.json({ approved: true });
      }
    }

    return NextResponse.json({ approved: false, reason: "not_approved" });
  } catch (error) {
    console.error("Check access error:", error);
    // Fail open for the app owner during development
    return NextResponse.json({ approved: false, reason: "error" });
  }
}
