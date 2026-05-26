import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a senior technical writer specializing in software engineering documentation. Generate structured, professional project documentation reports from provided metadata.

Format output as clean Markdown with these sections (use ## for section headers):

## Executive Summary
Brief overview of the project, its purpose, and current state.

## Technical Architecture
Analysis of the tech stack, how components interact, and architectural decisions.

## File Structure
Overview of uploaded files organized by category. Use a table if helpful.

## Metrics & Performance
Key metrics and performance indicators (skip if none provided).

## Implementation Notes
Notable technical details, patterns used, or important context.

## Status & Next Steps
Current status and suggested next actions.

Be concise, professional, and technically accurate. Use tables for structured data. Total length: 400–800 words.`;

interface ReportInput {
  projectName: string;
  description: string;
  techStack: string[];
  metrics: string | null;
  status: string;
  files: Array<{ filename: string; bucket: string; sizeBytes: number }>;
}

export async function generateProjectReport(input: ReportInput): Promise<string> {
  const filesByBucket: Record<string, typeof input.files> = {};
  for (const f of input.files) {
    (filesByBucket[f.bucket] ??= []).push(f);
  }

  const fileSummary = Object.entries(filesByBucket)
    .map(([bucket, files]) =>
      `**${bucket.replace(/_/g, " ")}**: ${files.map((f) => f.filename).join(", ")}`
    )
    .join("\n");

  const userMessage = `Generate a documentation report for this project:

**Name:** ${input.projectName}
**Status:** ${input.status}
**Description:** ${input.description}
**Tech Stack:** ${input.techStack.join(", ") || "Not specified"}
**Key Metrics:** ${input.metrics || "None provided"}

**Uploaded Files by Category:**
${fileSummary || "No files uploaded yet"}`;

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in AI response");
  }
  return textBlock.text;
}
