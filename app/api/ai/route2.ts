// // app/api/visualize/route.ts
// import { NextResponse } from "next/server";
// import { Groq } from "groq-sdk";
// import { VisualizationRequest, VisualizationResponse } from "@/lib/types";

// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// const LLM_MODEL = "meta-llama/llama-4-maverick-17b-128e-instruct";
// // const LLM_MODEL = "deepseek-r1-distill-llama-70b";

// export async function POST(request: Request) {
//   try {
//     const { repositoryData } = (await request.json()) as VisualizationRequest;
//     if (!repositoryData) {
//       return NextResponse.json(
//         { message: "Repository data is required" },
//         { status: 400 }
//       );
//     }

//     const {
//       name,
//       description,
//       fileTree,
//       readme = "",
//       language,
//     } = repositoryData;

//     // prepare truncated inputs
//     const treeLines =
//       fileTree
//         ?.filter((f) => f.type === "blob")
//         .slice(0, 100)
//         .map((f) => f.path)
//         .join("\n") || "No file tree available";

//     const readmeSnippet =
//       readme.length > 2000
//         ? readme.slice(0, 2000) + "\n...(truncated)"
//         : readme || "No README available";

//     // 1️⃣ STEP 1: EXPLANATION PROMPT
//     const explanationPrompt = `
// <file_tree>
// ${treeLines}
// </file_tree>

// <readme>
// ${readmeSnippet}
// </readme>

// Your task: As a principal software engineer, analyze the above file tree and README to explain the project's architecture.  
// • Identify project type, main components (frontend, backend, services, DBs).  
// • Call out architectural patterns (MVC, microservices, event-driven, etc.).  
// • Highlight key technologies and how they interact.  

// Return ONLY the explanation **wrapped** in <explanation>…</explanation> tags.
// `;

//     const expCompletion = await groq.chat.completions.create({
//       model: LLM_MODEL,
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a software architecture expert. Produce a concise, HTML-friendly explanation wrapped in <explanation> tags.",
//         },
//         { role: "user", content: explanationPrompt },
//       ],
//       temperature: 0.2,
//       max_tokens: 2000,
//     });

//     const explanation = expCompletion.choices[0]?.message.content || "";
//     const explanationMatch = explanation.match(
//       /<explanation>([\s\S]*)<\/explanation>/
//     );
//     const explanationText = explanationMatch
//       ? explanationMatch[1].trim()
//       : explanation;

//     // 2️⃣ STEP 2: COMPONENT MAPPING PROMPT
//     const mappingPrompt = `
// <explanation>
// ${explanationText}
// </explanation>

// <file_tree>
// ${treeLines}
// </file_tree>

// Your task: Map each major component from the explanation to its corresponding file or directory path.  
// Output as:
// <component_mapping>
// Component A: path/to/A
// Component B: path/to/B
// …
// </component_mapping>
// `;
//     const mapCompletion = await groq.chat.completions.create({
//       model: LLM_MODEL,
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a software architect assistant. Produce a mapping wrapped in <component_mapping> tags.",
//         },
//         { role: "user", content: mappingPrompt },
//       ],
//       temperature: 0.2,
//       max_tokens: 1000,
//     });

//     const mapping = mapCompletion.choices[0]?.message.content || "";
//     const mappingMatch = mapping.match(
//       /<component_mapping>([\s\S]*)<\/component_mapping>/
//     );
//     const componentMapping = mappingMatch ? mappingMatch[1].trim() : "";

//     // 3️⃣ STEP 3: MERMAID CODE PROMPT
//     const mermaidPrompt = `
// <explanation>
// ${explanationText}
// </explanation>

// <component_mapping>
// ${componentMapping}
// </component_mapping>

// Produce only the **Mermaid.js** diagram code (no fences or extra text), using:
// • flowchart TD  
// • subgraphs for layers  
// • click events with the exact paths from the mapping  
// • quoted labels when they contain special chars  
// • color classes for front/backend/db as appropriate  

// Return the raw Mermaid.js code.
// `;
//     const mermaidCompletion = await groq.chat.completions.create({
//       model: LLM_MODEL,
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a senior principal software engineer. Generate valid, clickable, color-coded Mermaid.js code only.",
//         },
//         { role: "user", content: mermaidPrompt },
//       ],
//       temperature: 0.3,
//       max_tokens: 3000,
//     });

//     const fullResponse = mermaidCompletion.choices[0]?.message.content || "";

//     // extract diagram and tuck explanation under ANALYSIS
//     const fenceRegex = /```(?:mermaid)?\s*([\s\S]*?)\s*```/i;
//     const diagramMatch = fullResponse.match(fenceRegex);
//     const diagram = diagramMatch ? diagramMatch[1].trim() : fullResponse;

//     const analysisHtml =
//       `<h3>Architecture Explanation</h3>` +
//       `<div>${explanationText.replace(/\n/g, "<br/>")}</div>`;

//     const result: VisualizationResponse = { diagram, analysis: analysisHtml };
//     return NextResponse.json(result);
//   } catch (error) {
//     console.error("Visualization error:", error);
//     return NextResponse.json(
//       { message: error instanceof Error ? error.message : "Unknown error" },
//       { status: 500 }
//     );
//   }
// }
