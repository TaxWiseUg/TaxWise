import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxWise Uganda — AI-Powered Tax SaaS Platform",
  description: "A professional, AI-powered tax platform for consultants, accountants, lawyers, and business owners in Uganda. Features TAT ruling analyzer, learning hub, and eFRIS compliance checks.",
  keywords: ["TaxWise", "Uganda", "Tax Appeals Tribunal", "URA", "eFRIS", "VAT", "PAYE", "Tax Calculator"],
  openGraph: {
    title: "TaxWise Uganda — AI-Powered Tax SaaS Platform",
    description: "AI-powered analysis of Tax Appeals Tribunal (TAT) rulings, compliance checking tools for eFRIS, VAT, and PAYE, and structured tax education.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
