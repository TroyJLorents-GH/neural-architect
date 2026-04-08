import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, secret } = body;

    if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { data: entry, error: findError } = await getSupabase()
      .from("waitlist")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (findError || !entry) {
      return NextResponse.json({ error: "Email not found on waitlist" }, { status: 404 });
    }

    if (entry.status === "approved") {
      return NextResponse.json({ message: "Already approved", invite_token: entry.invite_token });
    }

    const inviteToken = crypto.randomUUID();

    const { error: updateError } = await getSupabase()
      .from("waitlist")
      .update({
        status: "approved",
        invite_token: inviteToken,
        approved_at: new Date().toISOString(),
      })
      .eq("id", entry.id);

    if (updateError) throw updateError;

    const baseUrl = process.env.NEXTAUTH_URL || "https://neural-architect-black.vercel.app";
    const inviteLink = `${baseUrl}/invite/${inviteToken}`;

    return NextResponse.json({
      message: "User approved — send them the invite link below",
      invite_token: inviteToken,
      invite_link: inviteLink,
    });
  } catch (error) {
    console.error("Approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve user", details: String(error) },
      { status: 500 }
    );
  }
}
