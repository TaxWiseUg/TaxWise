import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";

// Initialize Anthropic Client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("text") as string || "";
    const caseType = formData.get("caseType") as string || "TAT Ruling";
    const userId = formData.get("userId") as string || "";

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Missing user identity" }, { status: 401 });
    }

    let textToAnalyze = rawText;

    // 1. If file is present, extract text using pdf-parse
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      try {
        const parser = new PDFParse({ data: buffer });
        const parsedPdf = await parser.getText();
        textToAnalyze = `[Extracted from uploaded file: ${file.name}]\n\n${parsedPdf.text}\n\n${rawText}`;
      } catch (pdfError) {
        console.error("PDF text extraction error:", pdfError);
        return NextResponse.json(
          { error: "Failed to parse text from the uploaded PDF document." },
          { status: 422 }
        );
      }
    }

    if (!textToAnalyze.trim()) {
      return NextResponse.json({ error: "No text content or file was provided for analysis." }, { status: 400 });
    }

    // 2. Call Anthropic Claude API securely
    const systemPrompt = `You are TaxWise, an AI specializing in Uganda tax law (URA, TAT, Income Tax Act, VAT Act, PAYE, eFRIS). Analyze the case/scenario. Respond ONLY in valid JSON. Do not write any markdown code blocks (like \`\`\`json), backticks, or other text outside the JSON object.
JSON format:
{
  "summary": "2-3 sentence plain summary",
  "keyIssues": ["issue1", "issue2", "issue3"],
  "verdict": "outcome or likely outcome",
  "risk": "low" | "medium" | "high",
  "riskNote": "one sentence on key risk",
  "tags": ["tag1", "tag2", "tag3"],
  "advice": "2-3 sentences of practical advice for the taxpayer or professional",
  "applicableLaw": ["Act Section 1", "Act Section 2"]
}`;

    const userMessage = `Case Type: ${caseType}\n\nCase Text/Details:\n${textToAnalyze}`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1200,
      temperature: 0.3, // Low temperature for consistent, accurate legal summary
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const responseText = message.content.map(block => {
      if (block.type === 'text') return block.text;
      return '';
    }).join('').trim();

    // 3. Clean up the response if markdown code block syntax is present
    let cleanText = responseText;
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Failed to parse JSON response from Claude:", responseText);
      return NextResponse.json(
        { error: "AI analysis was successfully generated but failed to parse into structured format." },
        { status: 500 }
      );
    }

    // 4. Save the case analysis to Supabase
    // Construct case title from PDF name, first line of text, or date
    const title = file ? `File Analysis: ${file.name}` : (rawText.split("\n")[0]?.slice(0, 80) || `Tax Scenario Analysis (${new Date().toLocaleDateString()})`);
    
    const { data: insertedCase, error: dbError } = await supabaseAdmin
      .from("cases")
      .insert({
        user_id: userId,
        title,
        input_text: textToAnalyze.slice(0, 100000), // Limit storage to avoid exceeding column limits if text is massive
        pdf_path: file ? `pdfs/${userId}/${Date.now()}_${file.name}` : null,
        ai_summary: parsedResult,
        risk_level: parsedResult.risk || "medium",
        tags: parsedResult.tags || [],
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase DB error saving case:", dbError);
      // We still return the analysis even if saving to DB fails, so the user experience doesn't break
    }

    return NextResponse.json({
      success: true,
      case: insertedCase,
      analysis: parsedResult,
    });
  } catch (error: any) {
    console.error("General case analyzer API error:", error);
    return NextResponse.json({ error: error?.message || "An unexpected error occurred during analysis." }, { status: 500 });
  }
}
