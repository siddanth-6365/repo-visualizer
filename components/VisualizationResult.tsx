'use client';
import { useRef, useMemo } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import { Download, Link as LinkIcon } from 'lucide-react';
import MermaidChart from './MermaidChart';
import { RepositoryData } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface VisualizationResultProps {
  repository: RepositoryData;
}

export function VisualizationResult({ repository }: VisualizationResultProps) {
  const diagramRef = useRef<HTMLDivElement>(null);

  // post-process the raw mermaid so that click paths become full GitHub URLs
  const chartWithUrls = useMemo(() => {
    if (!repository.visualization) return '';
    const { htmlUrl, defaultBranch } = repository;

    return repository.visualization.replace(
      /click\s+([A-Za-z0-9_]+)\s+"([^"]+)"/g,
      (_, nodeId, rawPath) => {
        const relativePath = rawPath.replace(/^file:\/\/\/?/, '');
        const isDir = relativePath.endsWith('/');
        const githubPath = isDir
          ? `${htmlUrl}/tree/${defaultBranch}/${relativePath}`
          : `${htmlUrl}/blob/${defaultBranch}/${relativePath}`;
        return `click ${nodeId} "${githubPath}" "_blank"`;
      }
    );
  }, [repository.htmlUrl, repository.defaultBranch, repository.visualization]);

  const downloadSvg = () => {
    const svg = diagramRef.current?.querySelector('svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repository.name}-diagram.svg`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!repository?.visualization) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              {repository.name}
            </CardTitle>
            <CardDescription>
              {repository.description || 'No description available'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadSvg}>
              <Download className="h-4 w-4 mr-2" />
              Download SVG
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={repository.htmlUrl} target="_blank" rel="noopener noreferrer">
                <LinkIcon className="h-4 w-4 mr-2" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-hidden">
        <div ref={diagramRef} className="min-h-[600px] w-full flex items-center justify-center py-8">
          <MermaidChart chart={chartWithUrls} zoomingEnabled={true} />
        </div>
      </CardContent>
    </Card>
  );
}
