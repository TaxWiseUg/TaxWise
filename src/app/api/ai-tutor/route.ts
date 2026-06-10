import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { courseTitle, lessonTitle, question } = await req.json();

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Missing question query" }, { status: 400 });
    }

    const systemPrompt = `You are a friendly Uganda tax education tutor.
The student is studying the course: "${courseTitle || "Uganda Taxation"}", Lesson: "${lessonTitle || "Tax Basics"}".
Answer questions in plain, easy-to-understand English. Always use Uganda-specific examples (URA, eFRIS, TAT, UGX, local businesses).
Reference the Income Tax Act, VAT Act, or relevant TAT precedents where helpful.
Keep answers concise (under 200 words) and direct, unless specifically asked to elaborate.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 600,
      temperature: 0.5,
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
    });

    const responseText = message.content.map(block => {
      if (block.type === 'text') return block.text;
      return '';
    }).join('').trim();

    return NextResponse.json({
      success: true,
      answer: responseText,
    });
  } catch (error: any) {
    console.error("AI Tutor API error:", error);
    return NextResponse.json({ error: error?.message || "Failed to communicate with AI Tutor." }, { status: 500 });
  }
}
