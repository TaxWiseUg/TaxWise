import { NextRequest, NextResponse } from "next/server";

const PLAN_PRICES: Record<string, number> = {
  starter: 50000,
  professional: 150000,
  firm: 400000,
};

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter Plan",
  professional: "Professional Plan",
  firm: "Firm/Corporate Plan",
};

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, email, name } = await req.json();

    if (!plan || !userId || !email) {
      return NextResponse.json({ error: "Missing required checkout parameters." }, { status: 400 });
    }

    const normalizedPlan = plan.toLowerCase();
    const amount = PLAN_PRICES[normalizedPlan];

    if (!amount) {
      return NextResponse.json({ error: "Invalid subscription plan selected." }, { status: 400 });
    }

    const txRef = `taxwise-sub-${userId}-${Date.now()}`;
    const flwSecret = process.env.FLUTTERWAVE_SECRET_KEY || "";

    // If FLW secret is not configured, we'll run in simulation mode for developer testing!
    // This allows testing payment flows locally without live API credentials.
    if (!flwSecret) {
      console.warn("Flutterwave API Key is missing. Simulating success redirect URL.");
      const mockCheckoutUrl = `/pricing?status=success&tx_ref=${txRef}&plan=${normalizedPlan}`;
      return NextResponse.json({
        success: true,
        simulated: true,
        link: mockCheckoutUrl
      });
    }

    // Call Flutterwave standard payments API
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flwSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: String(amount),
        currency: "UGX",
        redirect_url: `${req.nextUrl.origin}/pricing?status=completed`,
        meta: {
          userId,
          plan: normalizedPlan,
        },
        customer: {
          email: email,
          name: name || email.split("@")[0],
        },
        customizations: {
          title: "TaxWise Uganda",
          description: `Subscription for ${PLAN_NAMES[normalizedPlan]}`,
          logo: "https://taxwise.ug/logo.png", // Replace with actual logo URL
        },
      }),
    });

    const flwData = await response.json();

    if (flwData.status === "success" && flwData.data?.link) {
      return NextResponse.json({
        success: true,
        link: flwData.data.link,
      });
    } else {
      console.error("Flutterwave API Error Response:", flwData);
      return NextResponse.json(
        { error: flwData.message || "Failed to initiate payment gateway with Flutterwave." },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("Payment initiation API error:", error);
    return NextResponse.json({ error: error?.message || "Failed to process checkout initiation." }, { status: 500 });
  }
}
