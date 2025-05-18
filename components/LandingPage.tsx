// components/LandingPage.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { RepoForm } from '@/components/RepoForm';
import { VisualizationResult } from '@/components/VisualizationResult';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Braces, Boxes, Info, Loader2, Code, AlertCircle } from 'lucide-react';
import { ProcessingStatus, RepositoryData } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  /** something like "owner/repo" */
  initialRepo?: string;
}

export default function LandingPage({ initialRepo }: LandingPageProps) {
  const [repository, setRepository] = useState<RepositoryData | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAndVisualize = useCallback(
    async (repoUrl: string) => {
      try {
        setStatus('loading');
        setError(null);

        // 1. Fetch GitHub data
        const fetchRes = await fetch('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: repoUrl }),
        });
        if (!fetchRes.ok) {
          const { message } = await fetchRes.json();
          throw new Error(message || 'Failed to fetch repository data');
        }
        const githubData = await fetchRes.json();

        // 2. Generate visualization
        const aiRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repositoryData: githubData }),
        });
        if (!aiRes.ok) {
          const { message } = await aiRes.json();
          throw new Error(message || 'Failed to generate visualization');
        }
        const { diagram, analysis } = await aiRes.json();

        setRepository({ ...githubData, visualization: diagram, analysis });
        setStatus('completed');
        toast({
          title: 'Repository analyzed successfully!',
          description: 'Scroll down to see the visualization.',
        });
      } catch (err) {
        console.error(err);
        setStatus('error');
        const msg = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(msg);
        toast({
          variant: 'destructive',
          title: 'Error analyzing repository',
          description: msg,
        });
      }
    },
    [toast]
  );

  // if initialRepo is passed (via /[owner]/[repo] route), auto-submit once
  useEffect(() => {
    if (initialRepo && status === 'idle') {
      fetchAndVisualize(`https://github.com/${initialRepo}`);
    }
  }, [initialRepo, status, fetchAndVisualize]);

  const handleSubmit = async (repoUrl: string): Promise<void> => {
    await fetchAndVisualize(repoUrl);
  };

  return (
    <div className="container px-4 py-8 md:py-12 max-w-6xl mx-auto">
      <section className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-chart-1 dark:from-primary dark:to-chart-4 leading-tight pb-1">
          GitHub Repository Visualizer
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto">
          Generate interactive visualizations of GitHub repositories using AI.
          Analyze code relationships and explore project architecture through beautiful diagrams.
        </p>
      </section>

      <Card className="mb-12">
        <CardHeader>
          <CardTitle>Enter Repository URL</CardTitle>
          <CardDescription>
            Paste a GitHub repository URL to generate a visualization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepoForm onSubmit={handleSubmit} isLoading={status === 'loading'} defaultValue={
            initialRepo ? `https://github.com/${initialRepo}` : ''
          } />
        </CardContent>
      </Card>

      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Analyzing Repository</h3>
          <p className="text-muted-foreground text-center max-w-md">
            We're fetching data and generating a visualization. This may take a minute...
          </p>
        </div>
      )}

      {status === 'error' && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Info className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {repository && status === 'completed' && (
        <>
          <Tabs defaultValue="visualization" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="visualization" className="flex items-center gap-2">
                <Boxes className="h-4 w-4" />
                Visualization
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <Braces className="h-4 w-4" />
                Analysis
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visualization">
              <VisualizationResult repository={repository} />
            </TabsContent>

            <TabsContent value="analysis">
              <Card>
                <CardHeader>
                  <CardTitle>Repository Analysis</CardTitle>
                  <CardDescription>
                    AI-generated insights about code architecture and relationships
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    {repository.analysis ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                      >
                        {repository.analysis}
                      </ReactMarkdown>
                    ) : (
                      <p>No analysis available for this repository.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="code">
              <Card>
                <CardHeader>
                  <CardTitle>Mermaid Diagram Code</CardTitle>
                  <CardDescription>Copy the raw Mermaid.js diagram source</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded overflow-auto text-sm">
                    {repository.visualization}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(repository.visualization)}
                    className="mt-2"
                  >
                    Copy to Clipboard
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900 rounded flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              AI-generated diagrams can sometimes contain syntax errors. If your diagram fails to render,
              try again or test the raw code in the <a
                href="https://mermaid.live/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >Mermaid Live Editor</a>.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
