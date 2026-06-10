import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { C } from "../lib/constants";
import { Button, Card } from "./UI";

interface PricingPageProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    plan: string;
  };
  onRefreshUser: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ user, onRefreshUser }) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "completed" || status === "success") {
      setPaymentMessage("Thank you! Your payment was processed successfully and your account is being upgraded.");
      onRefreshUser(); // Refresh user profile to load upgraded plan from DB
    } else if (status === "cancelled") {
      setPaymentMessage("The checkout process was cancelled. You have not been charged.");
    }
  }, [searchParams]);

  const initiatePayment = async (planKey: string) => {
    setLoadingPlan(planKey);
    setPaymentMessage("");
    
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          userId: user.id,
          email: user.email,
          name: user.full_name,
        }),
      });

      if (!res.ok) throw new Error("Payment initiation failed");
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      if (data.link) {
        // Redirect to Flutterwave checkout page or simulated checkout URL
        window.location.href = data.link;
      }
    } catch (err: any) {
      console.error("Payment setup error:", err);
      setPaymentMessage("Failed to initiate payment gateway. Please check server settings.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      key: "starter",
      name: "Starter",
      price: "50K",
      period: "/ month",
      features: ["10 case analyses/month", "Basic AI summaries", "Learning Hub access", "PDF report export", "Email support"],
      cta: "Start Starter Plan",
    },
    {
      key: "professional",
      name: "Professional",
      price: "150K",
      period: "/ month",
      popular: true,
      features: [
        "100 case analyses/month",
        "Full AI analysis + precedents",
        "Compliance checker",
        "Client report builder",
        "PDF upload & analysis",
        "Deadline tracker",
        "Priority support",
      ],
      cta: "Upgrade to Professional",
    },
    {
      key: "firm",
      name: "Firm",
      price: "400K",
      period: "/ month",
      features: ["Unlimited analyses", "Up to 10 team members", "Custom client branding", "API access", "Admin portal", "Dedicated account manager"],
      cta: "Upgrade to Firm",
    },
  ];

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", color: C.navy, marginBottom: 8 }}>
          Simple, Honest Pricing
        </h1>
        <p style={{ color: C.muted, fontSize: "0.9rem" }}>Priced in Uganda Shillings. No hidden fees. Cancel anytime.</p>
      </div>

      {paymentMessage && (
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto 24px",
            background: paymentMessage.includes("successful") ? C.greenLight : C.goldLight,
            color: paymentMessage.includes("successful") ? C.green : C.gold,
            padding: "14px 20px",
            borderRadius: 10,
            fontSize: "0.875rem",
            fontWeight: 600,
            textAlign: "center",
            border: `1px solid ${paymentMessage.includes("successful") ? C.green : C.gold}`,
          }}
        >
          {paymentMessage}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {plans.map((p) => {
          const isCurrentPlan = user.plan?.toLowerCase() === p.key;
          
          return (
            <Card
              key={p.name}
              style={{
                padding: 28,
                position: "relative",
                border: p.popular ? `2px solid ${C.teal}` : `1px solid ${C.border}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                {p.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -13,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: C.teal,
                      color: C.white,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "4px 14px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    marginBottom: 10,
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "2.2rem", fontWeight: 800, color: C.navy }}>
                  UGX {p.price}
                </div>
                <div style={{ fontSize: "0.8rem", color: C.muted, marginBottom: 20 }}>{p.period}</div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 20 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ fontSize: "0.875rem", color: C.text, marginBottom: 10, display: "flex", gap: 8 }}>
                      <span style={{ color: C.teal, fontWeight: 700 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => !isCurrentPlan && initiatePayment(p.key)}
                variant={p.popular ? "primary" : "outline"}
                disabled={isCurrentPlan || loadingPlan !== null}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {loadingPlan === p.key ? "⟳ Connecting..." : isCurrentPlan ? "✓ Current Active Plan" : p.cta}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card style={{ padding: 24, marginTop: 24, background: C.navy }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: C.white, marginBottom: 4 }}>💳 Local Payment Methods Supported</div>
            <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,.6)" }}>
              MTN Mobile Money · Airtel Money · Visa/Mastercard
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {["MTN MoMo", "Airtel Money", "Visa", "Mastercard"].map((m) => (
              <div
                key={m}
                style={{
                  background: "rgba(255,255,255,.1)",
                  border: "1px solid rgba(255,255,255,.2)",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,.8)",
                  fontWeight: 600,
                }}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
