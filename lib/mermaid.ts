// lib/renderMermaidDiagram.ts
import mermaid from 'mermaid';

// Initialize once at import time
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'dark',
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
  },
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#4b5563',
    lineColor: '#6b7280',
    secondaryColor: '#475569',
    tertiaryColor: '#1e293b',
  },
});

/**
 * Renders a Mermaid diagram into `element`.
 * Throws on syntax errors.
 */
export async function renderMermaidDiagram(
  element: HTMLElement,
  definition: string
): Promise<void> {
  // 1) clear any old diagram
  element.innerHTML = '';

  // 2) check syntax early
  try {
    mermaid.parse(definition);
  } catch (syntaxError) {
    console.error('Mermaid syntax error:', syntaxError);
    throw syntaxError;
  }

  // 3) render to SVG string
  const uniqueId = `mermaid-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const renderResult = await mermaid.mermaidAPI.render(uniqueId, definition);
const svgCode = renderResult.svg;

  // 4) inject the SVG
  element.innerHTML = svgCode;

  // 5) optional post-styling
  const svg = element.querySelector<SVGSVGElement>('svg');
  if (svg) {
    svg.style.maxWidth = '100%';
    svg.style.height = 'auto';
    svg.querySelectorAll<SVGGElement>('.node').forEach((n) => {
      n.classList.add('transition-all', 'duration-200');
    });
  }
}
