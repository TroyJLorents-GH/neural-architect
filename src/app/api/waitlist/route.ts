import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const WAITLIST_FILE = path.join(process.cwd(), "waitlist.json");

async function getWaitlist(): Promise<{ email: string; signedUpAt: string }[]> {
  try {
    const data = await fs.readFile(WAITLIST_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

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

    const waitlist = await getWaitlist();

    // Check for duplicate
    if (waitlist.some((entry) => entry.email === email)) {
      return NextResponse.json({
        message: "You're already on the list!",
        alreadySignedUp: true,
      });
    }

    waitlist.push({ email, signedUpAt: new Date().toISOString() });
    await fs.writeFile(WAITLIST_FILE, JSON.stringify(waitlist, null, 2));

    return NextResponse.json({
      message: "You're on the list!",
      position: waitlist.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to sign up", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const waitlist = await getWaitlist();
  return NextResponse.json({ count: waitlist.length });
}
