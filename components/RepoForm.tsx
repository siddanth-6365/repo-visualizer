"use client";

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Github as GitHubLogoIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const repoSchema = z.object({
  url: z
    .string()
    .min(1, "Repository URL is required")
    .url("Must be a valid URL")
    .refine(
      (url) => /github\.com\/[\w.-]+\/[\w.-]+/.test(url),
      "Must be a valid GitHub repository URL"
    ),
});

type RepoFormValues = z.infer<typeof repoSchema>;

type RepoFormProps = {
  onSubmit: (url: string) => Promise<void>;
  isLoading: boolean;
};

export function RepoForm({ onSubmit, isLoading }: RepoFormProps) {
  const [recentRepos, setRecentRepos] = useState<string[]>([]);

  const form = useForm<RepoFormValues>({
    resolver: zodResolver(repoSchema),
    defaultValues: {
      url: '',
    },
  });

  useEffect(() => {
    // Load recent repositories from localStorage
    const saved = localStorage.getItem('recentRepositories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentRepos(parsed.slice(0, 5));
        }
      } catch (e) {
        console.error('Failed to parse recent repositories', e);
      }
    }
  }, []);

  const saveRecentRepo = (url: string) => {
    const newRecentRepos = [url, ...recentRepos.filter(r => r !== url)].slice(0, 5);
    setRecentRepos(newRecentRepos);
    localStorage.setItem('recentRepositories', JSON.stringify(newRecentRepos));
  };

  const handleSubmit = async (values: RepoFormValues) => {
    saveRecentRepo(values.url);
    await onSubmit(values.url);
  };

  const selectRecentRepo = (url: string) => {
    form.setValue('url', url);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repository URL</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <GitHubLogoIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="https://github.com/username/repository"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Analyzing...' : 'Visualize'}
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Enter a public GitHub repository URL to generate a visualization
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {recentRepos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Recent repositories</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentRepos.map((repo, index) => {
                // Extract repo name from URL
                const match = repo.match(/github\.com\/[\w.-]+\/([\w.-]+)/);
                const repoName = match ? match[1] : repo;

                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => selectRecentRepo(repo)}
                    className="text-xs"
                  >
                    <GitHubLogoIcon className="mr-1 h-3 w-3" />
                    {repoName}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}