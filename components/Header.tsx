"use client";

import { useState, useEffect } from 'react';
import { MoonIcon, SunIcon, Github as GitHubIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className={cn(
      "sticky top-0 z-30 w-full transition-colors duration-300",
      "bg-background/80 backdrop-blur-md border-b"
    )}>
      <div className="w-full max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitHubIcon className="h-6 w-6" />
          <h1 className="text-xl font-bold">Repo Visualizer</h1>
        </div>

        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </Button>
          )}

          <Button variant="outline" size="sm" asChild>
            <Link href="https://github.com/siddanth-6365/repo-visualizer" target="_blank" rel="noopener noreferrer">
              <GitHubIcon className="mr-2 h-4 w-4" />
              View Source
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}