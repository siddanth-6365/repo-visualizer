import { NextResponse } from "next/server";
import OpenAI from "openai";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { VisualizationRequest, VisualizationResponse } from "@/lib/types";

// 1) configure in-memory limiter: 5 points per 60 seconds
const rateLimiter = new RateLimiterMemory({
  points: 5, // up to 5 requests
  duration: 1800, // per 30 minutes by IP
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
  // console.log("o4-mini response:", content);
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
    const system1 = `
    You are tasked with explaining to a principal software engineer how to draw the best and most accurate system design diagram / architecture of a given project. This explanation should be tailored to the specific project's purpose and structure. To accomplish this, you will be provided with two key pieces of information:
    
    1. The complete and entire file tree of the project including all directory and file names, which will be enclosed in <file_tree> tags in the user's message.
    
    2. The README file of the project, which will be enclosed in <readme> tags in the user's message.
    
    Analyze these components carefully, as they will provide crucial information about the project's structure and purpose. Follow these steps to create an explanation for the principal software engineer:
    
    1. Identify the project type and purpose:
       - Examine the file structure and README to determine if the project is a full-stack application, an open-source tool, a compiler, or another type of software.
       - Look for key indicators in the README, such as project description, features, or use cases.
    
    2. Analyze the file structure:
       - Pay attention to top-level directories and their names (e.g., "frontend", "backend", "src", "lib", "tests").
       - Identify patterns in the directory structure that might indicate architectural choices (e.g., MVC, microservices).
       - Note any configuration files, build scripts, or deployment-related files.
    
    3. Examine the README for additional insights:
       - Look for sections describing the architecture, dependencies, or technical stack.
       - Check for any diagrams or explanations of the system's components.
    
    4. Based on your analysis, explain how to create a system design diagram that accurately represents the project's architecture. Include:
       a. The main components (e.g., frontend, backend, database, external services).
       b. The relationships and interactions between components.
       c. Any important architectural patterns or design principles.
       d. Relevant technologies, frameworks, or libraries in use.
    
    5. Provide guidelines for tailoring the diagram to the specific project type:
       - For a full-stack app, emphasize separation of frontend/backend, database interactions, and API layers.
       - For an open-source tool, focus on core functionality, extensibility points, and integration.
       - For compilers/language projects, highlight compilation stages, intermediate representations, etc.
    
    6. Instruct the engineer to include in the diagram:
       - Clear labels for each component.
       - Directional arrows for data flow/dependencies.
       - Color coding or shapes to distinguish component types.
    
    7. Emphasize being very detailed and capturing essential architectural elements without overthinking—separate the system into as many logical components as makes sense.
    
    Return your explanation wrapped only in <explanation>…</explanation> tags, and make it concise and HTML-friendly.
    `.trim();

    const user1 = `
    <file_tree>
    ${treeLines}
    </file_tree>
    
    <readme>
    ${readmeSnippet}
    </readme>
    
    Your task: As a principal software engineer, analyze the above file tree and README to explain the project's architecture following the system instructions. Return ONLY the explanation wrapped in <explanation>…</explanation> tags.
    `;
    const explanationRaw = await callO4Mini(system1, user1, "medium", 2000);
    const explanationMatch = explanationRaw.match(
      /<explanation>([\s\S]*?)<\/explanation>/
    );
    const explanationText = explanationMatch
      ? explanationMatch[1].trim()
      : explanationRaw.trim();

    await new Promise((r) => setTimeout(r, 500));

    // STEP 2: Component mapping
    const system2 = `
You are tasked with mapping key components of a system design to their corresponding files and directories in a project's file structure. You will be provided with a detailed explanation of the system design/architecture and a file tree of the project.

First, carefully read the system design explanation which will be enclosed in <explanation> tags in the user's message.

Then, examine the file tree of the project which will be enclosed in <file_tree> tags in the user's message.

Your task is to analyze the system design explanation and identify key components, modules, or services mentioned. Then, try your best to map these components to what you believe could be their corresponding directories and files in the provided file tree.

Guidelines:
1. Focus on major components described in the system design.
2. Look for directories and files that clearly correspond to these components.
3. Include both directories and specific files when relevant.
4. If a component doesn't have a clear corresponding file or directory, simply don’t include it in the map.

Provide your final answer in the following format, wrapped in <component_mapping> tags (and nothing else):

<component_mapping>
1. [Component Name]: [File/Directory Path]
2. [Component Name]: [File/Directory Path]
…  
</component_mapping>
`.trim();

    const user2 = `
<explanation>
${explanationText}
</explanation>

<file_tree>
${treeLines}
</file_tree>

Your task: Map each major component from the explanation to its corresponding file or directory path, following the system instructions exactly.
`;

    const mappingRaw = await callO4Mini(system2, user2, "low", 2000);

    const mappingMatch = mappingRaw.match(
      /<component_mapping>([\\s\\S]*?)<\/component_mapping>/
    );
    const componentMapping = mappingMatch
      ? mappingMatch[1].trim()
      : mappingRaw.trim();

    await new Promise((r) => setTimeout(r, 500));

    // STEP 3: Generate Mermaid diagram
    const system3 = `
You are a principal software engineer tasked with creating a system design diagram using Mermaid.js based on a detailed explanation. Your goal is to accurately represent the architecture and design of the project as described in the explanation.

The detailed explanation of the design will be enclosed in <explanation> tags in the user's message.
Also, sourced from the explanation, some components have been mapped to their file paths in the project, which will be enclosed in <component_mapping> tags in the user's message.

To create the Mermaid.js diagram:
1. Carefully read and analyze the provided design explanation.
2. Identify the main components, services, and their relationships within the system.
3. Use a flowchart TD (top-down) layout to keep it vertical.
4. Create the Mermaid.js code ensuring:
   - All major components are included
   - Relationships are clearly shown with arrows
   - The layout is logical and easy to follow

Guidelines:
- Use rectangles/cylinders/etc. for different component types.
- Quote any node label containing spaces or special characters.
- Do **not** style subgraph headers; apply classDef styles to nodes only.
- Group related nodes with subgraph blocks.
- Include click events for every component in <component_mapping>:
  - **Path only**, no URLs (e.g. click Example "app/example.js")
  - Use directory paths for directories, file paths for files.
- Avoid long horizontal chains—keep the graph vertical.
- Include color classes via classDef and apply them to nodes.

Output **only** the raw Mermaid.js code—no fences, markdown, init blocks, or extra text.
`.trim();

    const user3 = `
<explanation>
${explanationText}
</explanation>

<component_mapping>
${componentMapping}
</component_mapping>
`;

    const mermaidRaw = await callO4Mini(system3, user3, "low", 5000);

    // Strip any triple-backtick fences if present:
    const fenceRegex = /```(?:mermaid)?\s*([\s\S]*?)\s*```/i;
    const diagram =
      mermaidRaw.match(fenceRegex)?.[1].trim() ?? mermaidRaw.trim();

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
