import { NextResponse } from "next/server";
import OpenAI from "openai";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { VisualizationRequest, VisualizationResponse } from "@/lib/types";

// 1) configure in-memory limiter: 5 points per 60 seconds
const rateLimiter = new RateLimiterMemory({
  points: 5, // up to 5 requests
  duration: 300, // per 5 minutes by IP
});

// Initialize OpenAI client for o4-mini
type ReasoningEffort = "low" | "medium" | "high";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const O4_MODEL = "o4-mini";

async function callO4Mini(
  systemPrompt: string,
  userPrompt: string,
  reasoningEffort: ReasoningEffort = "low",
  maxTokens: number = 12000
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: O4_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: maxTokens,
    reasoning_effort: reasoningEffort,
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from o4-mini");
  return content;
}

export async function POST(request: Request) {
  // 2) pull client IP (adjust header logic as needed for your deployment)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // 3) consume a point, or bail with 429
  try {
    await rateLimiter.consume(ip);
  } catch {
    return NextResponse.json(
      { message: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { repositoryData } = (await request.json()) as VisualizationRequest;
    if (!repositoryData) {
      return NextResponse.json(
        { message: "Repository data is required" },
        { status: 400 }
      );
    }

    const { name, description, fileTree, readme = "" } = repositoryData;

    // Truncate inputs to control context size
    const treeLines =
      fileTree
        ?.filter((f) => f.type === "blob")
        .slice(0, 100)
        .map((f) => f.path)
        .join("\n") || "No file tree available";

    const readmeSnippet =
      readme.length > 2000
        ? readme.slice(0, 2000) + "\n...(truncated)"
        : readme || "No README available";

    // STEP 1: Explanation
    const system1 =
      "You are a software architecture expert. Produce a concise, HTML-friendly explanation wrapped in <explanation> tags.";
    const user1 = `
<file_tree>
${treeLines}
</file_tree>

<readme>
${readmeSnippet}
</readme>

Your task: As a principal software engineer, analyze the above file tree and README to explain the project's architecture.
• Identify project type, main components (frontend, backend, services, DBs).
• Call out architectural patterns (MVC, microservices, event-driven, etc.).
• Highlight key technologies and how they interact.

Return ONLY the explanation wrapped in <explanation>…</explanation> tags.
`;
    const explanationRaw = await callO4Mini(system1, user1, "medium", 2000);
    const explanationMatch = explanationRaw.match(
      /<explanation>([\s\S]*?)<\/explanation>/
    );
    const explanationText = explanationMatch
      ? explanationMatch[1].trim()
      : explanationRaw.trim();

    // STEP 2: Component mapping
    const system2 =
      "You are a software architect assistant. Produce a mapping wrapped in <component_mapping> tags.";
    const user2 = `
<explanation>
${explanationText}
</explanation>

<file_tree>
${treeLines}
</file_tree>

Your task: Map each major component from the explanation to its corresponding file or directory path.
Output as:
<component_mapping>
Component A: path/to/A
Component B: path/to/B
…
</component_mapping>
`;
    const mappingRaw = await callO4Mini(system2, user2, "low", 1000);
    const mappingMatch = mappingRaw.match(
      /<component_mapping>([\s\S]*?)<\/component_mapping>/
    );
    const componentMapping = mappingMatch ? mappingMatch[1].trim() : "";

    // STEP 3: Mermaid diagram
    const system3 = `
You are a senior principal software engineer. Generate valid, clickable, color-coded Mermaid.js code only.

Note: Any node label containing spaces or special characters must be wrapped in a single pair of double quotes inside the brackets.  
Example: TB["Telegram Bot (python-telegram-bot)"]

Return only the raw Mermaid.js code (no fences or markdown).
`;
    const user3 = `
<explanation>
${explanationText}
</explanation>

<component_mapping>
${componentMapping}
</component_mapping>

Produce only the Mermaid.js diagram code (no fences or extra text), using:
• flowchart TD
• subgraphs for layers
• click events with exact paths from the mapping
• quoted labels when containing special chars
• color classes for front/backend/db as appropriate

Return the raw Mermaid.js code.
`;
    const mermaidRaw = await callO4Mini(system3, user3, "low", 3000);

    // strip triple-backtick fences if any
    const fenceRegex = /```(?:mermaid)?\s*([\s\S]*?)\s*```/i;
    const diagramMatch = mermaidRaw.match(fenceRegex);
    const diagram = diagramMatch ? diagramMatch[1].trim() : mermaidRaw.trim();

    // build HTML analysis
    const analysisHtml =
      `<h3>Architecture Explanation</h3>` +
      `<div>${explanationText.replace(/\n/g, "<br/>")}</div>`;

    const result: VisualizationResponse = { diagram, analysis: analysisHtml };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Visualization error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
