import { GoogleGenerativeAI } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are a technical diagram expert. Given a project spec, generate a Mermaid flowchart diagram that visually represents the system architecture.

Strict rules — violating any of these will break rendering:
- Output ONLY valid Mermaid syntax — no markdown fences, no explanation, no prose, no comments
- Start with exactly: flowchart TD
- Node IDs: short alphanumeric only, no spaces, no hyphens (e.g. A, FIA, GForms)
- Node labels: always wrap in double quotes if they contain spaces, hyphens, or special chars
  GOOD: A["Google Forms"]  BAD: A[Google Forms]  BAD: A[Google-Forms]
- Subgraph IDs: short alphanumeric only. Subgraph labels must be quoted
  GOOD: subgraph Input["Input Layer"]  BAD: subgraph Input-Layer
- Arrow labels: use -->|"label"| syntax, keep labels short, no hyphens in labels
  GOOD: A -->|"form submit"| B  BAD: A -- label --> B
- DO NOT use the -- --> arrow style, only use --> and -->|"label"|
- Data stores: use [("Name")] syntax
- External APIs: use (["Name"]) syntax
- Processes: use ["Name"] syntax
- Keep it 8 to 16 nodes max for readability

Example of perfectly valid output:
flowchart TD
  subgraph Input["Input Layer"]
    A(["Google Forms"])
    B["Lambda Webhook"]
  end
  subgraph Agents["Agent Layer"]
    C["Intake Agent"]
    D["Recommendation Agent"]
  end
  A -->|"submit"| B
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
