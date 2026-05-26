import { GoogleGenerativeAI } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are a technical diagram expert. Given a project spec, generate a Mermaid flowchart diagram that visually represents the system architecture.

Rules:
- Output ONLY valid Mermaid syntax — no markdown code fences, no explanation, no prose
- Start with: flowchart TD
- Use subgraphs to group related components (e.g. Input Layer, Agent Layer, Data Layer, Output Layer)
- Node IDs must be alphanumeric with no spaces or special characters
- Labels in quotes can have spaces and punctuation
- Keep it readable — 8 to 20 nodes max
- Use --> for arrows with labels like -->|label|
- Represent data stores with [(name)] syntax
- Represent decisions with {name} syntax
- Represent processes with [name] syntax
- Represent external systems with([name]) syntax

Example of valid syntax:
flowchart TD
  subgraph Input["Input Layer"]
    A([Google Forms])
    B[Lambda Webhook]
  end
  subgraph Agents["Agent Layer"]
    C[Intake Agent]
    D[Recommendation Agent]
  end
  A -->|form submit| B
  B --> C
  C --> D`;

export async function generateDiagram(markdownContent: string): Promise<string> {
  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `Generate a Mermaid architecture diagram for this project spec:\n\n${markdownContent}`
  );

  let code = result.response.text().trim();

  // Strip any accidental markdown fences
  code = code.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();

  return code;
}
