import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.trim()?.toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const { data: existing } = await getSupabase()
      .from("waitlist")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return NextResponse.json({
        message: "You're already on the list!",
        alreadySignedUp: true,
      });
    }

    // Insert new signup
    const { error } = await getSupabase()
      .from("waitlist")
      .insert({ email, source: "landing" });

    if (error) {
      // Unique constraint violation (race condition)
      if (error.code === "23505") {
        return NextResponse.json({
          message: "You're already on the list!",
          alreadySignedUp: true,
        });
      }
      throw error;
    }

    // Get position (total count)
    const { count } = await getSupabase()
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      message: "You're on the list!",
      position: count || 1,
    });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { error: "Failed to sign up" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { count } = await getSupabase()
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ count: count || 0 });
}
