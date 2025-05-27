"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { RepoForm } from "@/components/RepoForm"
import { VisualizationResult } from "@/components/VisualizationResult"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Boxes,
  Code,
  AlertCircle,
  Github,
  Brain,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  Copy,
  ExternalLink,
} from "lucide-react"
import type { ProcessingStatus, RepositoryData } from "@/lib/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LandingPageProps {
  initialRepo?: string
}

type ProcessingStep = "idle" | "github" | "ai" | "completed" | "error"

interface StepInfo {
  id: ProcessingStep
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const PROCESSING_STEPS: StepInfo[] = [
  {
    id: "github",
    label: "Fetching Repository",
    description: "Analyzing repository structure and files",
    icon: Github,
  },
  {
    id: "ai",
    label: "AI Analysis",
    description: "Generating visualization and insights",
    icon: Brain,
  },
  {
    id: "completed",
    label: "Complete",
    description: "Ready to explore your visualization",
    icon: CheckCircle2,
  },
]

export default function ImprovedLandingPage({ initialRepo }: LandingPageProps) {
  const [repository, setRepository] = useState<RepositoryData | null>(null)
  const [status, setStatus] = useState<ProcessingStatus>("idle")
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("visualization")
  const { toast } = useToast()

  const updateProgress = (step: ProcessingStep) => {
    setCurrentStep(step)
    switch (step) {
      case "github":
        setProgress(0)
        break
      case "ai":
        setProgress(30)
        break
      case "completed":
        setProgress(100)
        break
      default:
        setProgress(0)
    }
  }

  const fetchAndVisualize = useCallback(
    async (repoUrl: string) => {
      try {
        setStatus("loading")
        setError(null)
        setProgress(0)

        // Step 1: Fetch GitHub data
        updateProgress("github")
        const fetchRes = await fetch("/api/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: repoUrl }),
        })

        if (!fetchRes.ok) {
          const { message } = await fetchRes.json()
          throw new Error(message || "Failed to fetch repository data")
        }
        const githubData = await fetchRes.json()

        // Step 2: Generate visualization
        updateProgress("ai")
        const aiRes = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repositoryData: githubData }),
        })

        if (!aiRes.ok) {
          const { message } = await aiRes.json()
          throw new Error(message || "Failed to generate visualization")
        }
        const { diagram, analysis } = await aiRes.json()

        // Step 3: Complete
        updateProgress("completed")
        setRepository({ ...githubData, visualization: diagram, analysis })
        setStatus("completed")

        toast({
          title: "Repository analyzed successfully!",
          description: "Scroll down to explore your visualization.",
        })
      } catch (err) {
        console.error(err)
        setStatus("error")
        setCurrentStep("error")
        const msg = err instanceof Error ? err.message : "An unknown error occurred"
        setError(msg)
        toast({
          variant: "destructive",
          title: "Error analyzing repository",
          description: msg,
        })
      }
    },
    [toast],
  )

  useEffect(() => {
    if (initialRepo && status === "idle") {
      fetchAndVisualize(`https://github.com/${initialRepo}`)
    }
  }, [initialRepo, status, fetchAndVisualize])

  const handleSubmit = async (repoUrl: string): Promise<void> => {
    await fetchAndVisualize(repoUrl)
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard!",
      description: "The diagram code has been copied.",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container px-4 py-8 md:py-12 max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="mb-12 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-chart-1/10 rounded-3xl blur-3xl -z-10" />
          {/* <Badge variant="secondary" className="mb-6 px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            AI-Powered Repository Analysis
          </Badge> */}
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary via-chart-1 to-chart-2 leading-tight pb-2">
            GitHub Repository
            <br />
            <span className="text-3xl md:text-5xl">Visualizer</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-4xl mx-auto leading-relaxed">
            Transform your GitHub repositories into beautiful, interactive visualizations. Understand code relationships
            and explore project architecture with AI-powered insights.
          </p>
        </section>

        {/* Input Section */}
        <Card className="mb-8 border-2 shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl flex items-center gap-3">
              <Github className="h-6 w-6" />
              Repository Analysis
            </CardTitle>
            <CardDescription className="text-base">
              Enter a GitHub repository URL to generate an AI-powered visualization and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RepoForm
              onSubmit={handleSubmit}
              isLoading={status === "loading"}
              defaultValue={initialRepo ? `https://github.com/${initialRepo}` : ""}
            />
          </CardContent>
        </Card>

        {/* Loading Section with Steps */}
        {status === "loading" && (
          <Card className="mb-8 border-2 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <Clock className="h-6 w-6 animate-pulse" />
                Analyzing Repository
              </CardTitle>
              <CardDescription>Please wait while we process your repository...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              {/* Steps */}
              <div className="grid gap-4">
                {PROCESSING_STEPS.map((step, index) => {
                  const isActive = currentStep === step.id
                  const isCompleted = PROCESSING_STEPS.findIndex((s) => s.id === currentStep) > index
                  const Icon = step.icon

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-500",
                        isActive && "border-primary bg-primary/5 shadow-md",
                        isCompleted && "border-green-500 bg-green-50 dark:bg-green-950",
                        !isActive && !isCompleted && "border-muted bg-muted/20",
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-500",
                          isActive && "border-primary bg-primary text-primary-foreground animate-pulse",
                          isCompleted && "border-green-500 bg-green-500 text-white",
                          !isActive && !isCompleted && "border-muted-foreground/30 bg-muted",
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3
                          className={cn(
                            "font-semibold text-lg transition-colors",
                            isActive && "text-primary",
                            isCompleted && "text-green-600 dark:text-green-400",
                          )}
                        >
                          {step.label}
                        </h3>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                      {isCompleted && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Section */}
        {status === "error" && (
          <Card className="mb-12 border-destructive shadow-xl">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-3">
                <AlertCircle className="h-6 w-6" />
                Analysis Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-destructive/10 p-4 rounded-lg">
                <p className="text-destructive font-medium">{error}</p>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setStatus("idle")
                  setError(null)
                  setCurrentStep("idle")
                  setProgress(0)
                }}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {repository && status === "completed" && (
          <div className="space-y-8">
            {/* Repository Info Card */}
            <Card className="border-2 shadow-xl bg-gradient-to-r from-card to-card/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                      Analysis Complete
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                      Repository: <span className="font-mono font-semibold">{repository.name}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Generated
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Enhanced Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-14 p-1 bg-muted/50 backdrop-blur-sm">
                <TabsTrigger
                  value="visualization"
                  className="flex items-center gap-3 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md"
                >
                  <Boxes className="h-5 w-5" />
                  Visualization
                </TabsTrigger>
                <TabsTrigger
                  value="analysis"
                  className="flex items-center gap-3 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md"
                >
                  <FileText className="h-5 w-5" />
                  Analysis
                </TabsTrigger>
                <TabsTrigger
                  value="code"
                  className="flex items-center gap-3 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md"
                >
                  <Code className="h-5 w-5" />
                  Source Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visualization" className="mt-8">
                <VisualizationResult repository={repository} />
              </TabsContent>

              <TabsContent value="analysis" className="mt-8">
                <Card className="border-2 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Brain className="h-6 w-6" />
                      AI-Generated Analysis
                    </CardTitle>
                    <CardDescription>Deep insights about your repository's structure and patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none prose-lg">
                      {repository.analysis ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                          {repository.analysis}
                        </ReactMarkdown>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No analysis available for this repository.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="code" className="mt-8">
                <Card className="border-2 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Code className="h-6 w-6" />
                      Mermaid Diagram Source
                    </CardTitle>
                    <CardDescription>Copy and modify the raw Mermaid.js diagram code</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(repository.visualization ?? "")}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Code
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href="https://mermaid.live/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open in Mermaid Live
                        </a>
                      </Button>
                    </div>
                    <div className="relative">
                      <pre className="bg-muted/50 p-6 rounded-lg overflow-auto text-sm border-2 max-h-96">
                        <code>{repository.visualization ?? ""}</code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Disclaimer */}
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">AI-Generated Content Notice</p>
                    <p>
                      This visualization and analysis are generated by AI and may contain inaccuracies. If the diagram
                      fails to render, you can test and edit the code in the{" "}
                      <a
                        href="https://mermaid.live/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100"
                      >
                        Mermaid Live Editor
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
