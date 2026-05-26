import { GoogleGenerativeAI } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are a senior software architect and technical writer at a fast-moving engineering team. Your job is to transform rough project ideas, notes, and drafts into a structured, professional technical specification document.

Generate a comprehensive spec in clean Markdown using exactly these sections:

## Overview
2–3 sentences: what this project is, who it's for, and what it achieves.

## Problem Statement
What problem does this solve? Who is affected? Why does it matter now?

## Proposed Solution
High-level description of what will be built and how it addresses the problem. Include key design decisions.

## Technical Architecture
Describe the system components, data flow, and integrations. Use a table or bullet structure:

| Component | Responsibility |
|---|---|

## Recommended Tech Stack
| Layer | Technology | Reason |
|---|---|---|

## Implementation Phases
Break into concrete phases with tasks and rough effort:

### Phase 1: [Name] (~X days)
- [ ] Task
- [ ] Task

### Phase 2: [Name] (~X days)
- [ ] Task

## Dependencies & Risks
| Risk | Likelihood | Mitigation |
|---|---|---|

## Success Metrics
What does "done" and "successful" look like? Include measurable criteria.

## Open Questions
Numbered list of decisions that need to be resolved before or during implementation.

Be specific, technical, and actionable. Do not pad with generic statements. Total length: 700–1400 words.`;

export interface SpecInput {
  projectName: string;
  description: string;
  techStack: string[];
  draftText: string;
}

export async function generateSpec(input: SpecInput): Promise<string> {
  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const userMessage = `Generate a technical specification for this project.

**Project Name:** ${input.projectName}
**Current Description:** ${input.description}
**Known Tech Stack:** ${input.techStack.join(", ") || "Not yet decided"}

**Draft ideas / notes from the team:**
---
${input.draftText}
---

Transform the above into a complete, actionable technical specification.`;

  const result = await model.generateContent(userMessage);
  return result.response.text();
}
