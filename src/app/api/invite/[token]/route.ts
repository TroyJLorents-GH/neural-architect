import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ valid: false, error: "No token provided" });
  }

  const { data, error } = await getSupabase()
    .from("waitlist")
    .select("email, status, invite_token")
    .eq("invite_token", token)
    .eq("status", "approved")
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: "Invalid or expired invite" });
  }

  return NextResponse.json({ valid: true, email: data.email });
}
