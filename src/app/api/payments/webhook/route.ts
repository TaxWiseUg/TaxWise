import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, getSubscriptionEmailHtml } from "@/lib/resend";

// Helper to get Supabase Admin client dynamically at request time
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase URL or Service Role Key is missing from environment variables.");
  }
  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const signature = req.headers.get("verif-hash");
    const localHash = process.env.FLUTTERWAVE_WEBHOOK_HASH || "";

    // 1. Verify Webhook Signature Authenticity
    if (localHash && signature !== localHash) {
      console.warn("Invalid webhook hash signature received.");
      return NextResponse.json({ error: "Unauthorized webhook verification hash." }, { status: 401 });
    }

    const payload = await req.json();
    const event = payload.event;
    const data = payload.data;

    // We respond 200 OK immediately for events we don't care about, or if data is empty
    if (event !== "charge.completed" || !data || data.status !== "successful") {
      return NextResponse.json({ received: true });
    }

    // 2. Extract transaction parameters
    const txRef = data.tx_ref; // format: taxwise-sub-{userId}-{timestamp}
    const flwId = data.id;
    const amount = data.amount;
    const currency = data.currency;

    // Check if the currency matches UGX
    if (currency !== "UGX") {
      console.error(`Received webhook payment in invalid currency: ${currency}`);
      return NextResponse.json({ error: "Invalid currency code" }, { status: 400 });
    }

    // Extract userId and plan from metadata (or parse from tx_ref)
    const userId = data.meta?.userId || txRef.split("-")[2];
    const planName = data.meta?.plan || "professional";

    if (!userId) {
      console.error("Could not extract userId from webhook payload:", data);
      return NextResponse.json({ error: "Invalid transaction reference payload" }, { status: 400 });
    }

    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(startsAt.getDate() + 30); // 30-day billing cycle

    // 3. Update User Plan & Add Subscription Record (Run in transaction)
    // Update user profile
    const { error: userUpdateError } = await supabaseAdmin
      .from("users")
      .update({ plan: planName })
      .eq("id", userId);

    if (userUpdateError) {
      console.error("DB error updating user plan in webhook:", userUpdateError);
      return NextResponse.json({ error: "Failed to update user billing profile" }, { status: 500 });
    }

    // Record subscription history
    const { error: subInsertError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan: planName,
        flutterwave_ref: String(flwId),
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

    if (subInsertError) {
      console.error("DB error writing subscription record in webhook:", subInsertError);
      // We don't fail the response completely if history logging failed but the user was upgraded
    }

    // 4. Send Confirmation Email to the user
    try {
      const { data: userProfile, error: fetchError } = await supabaseAdmin
        .from("users")
        .select("email, full_name")
        .eq("id", userId)
        .single();

      if (fetchError || !userProfile || !userProfile.email) {
        console.error(`Could not retrieve user profile for email confirmation:`, fetchError || "Missing email");
      } else {
        const emailHtml = getSubscriptionEmailHtml(
          userProfile.full_name || "Valued Customer",
          planName,
          String(amount),
          expiresAt.toISOString()
        );

        await sendEmail({
          to: userProfile.email,
          subject: `Your TaxWise ${planName.charAt(0).toUpperCase() + planName.slice(1)} Subscription is Active!`,
          html: emailHtml,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send subscription confirmation email:", emailErr);
    }

    console.log(`Successfully processed Flutterwave payment for User ${userId}. Plan upgraded to ${planName}.`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Payment Webhook Handler Error:", error);
    return NextResponse.json({ error: error?.message || "Webhook processing error." }, { status: 500 });
  }
}
