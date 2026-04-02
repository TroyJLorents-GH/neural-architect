import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple admin secret to protect this endpoint
const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, secret } = body;

    // Verify admin secret
    if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find the waitlist entry
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

    // Generate invite token and approve
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

    // Build invite link
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const inviteLink = `${baseUrl}/invite/${inviteToken}`;

    // Send email
    if (process.env.RESEND_API_KEY) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Neural Architect <onboarding@resend.dev>";

      await resend.emails.send({
        from: fromEmail,
        to: email.toLowerCase().trim(),
        subject: "You're in! Your Neural Architect early access invite",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; background: #4f46e5; color: white; font-weight: 700; font-size: 18px; text-align: center;">NA</div>
            </div>
            <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px; text-align: center;">Welcome to Neural Architect</h1>
            <p style="color: #6b7280; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
              You've been approved for early access. Click the button below to sign in and start exploring your AI DevOps dashboard.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${inviteLink}" style="display: inline-block; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Get Started
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 13px; text-align: center; line-height: 1.5;">
              This invite link is unique to you. Once you sign in with any supported provider (GitHub, Microsoft, GitLab, or Google), your account will be permanently activated.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Neural Architect · AI DevOps Dashboard
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({
      message: "User approved and email sent",
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
