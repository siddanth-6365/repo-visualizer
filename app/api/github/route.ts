import { NextResponse } from 'next/server';
import { fetchRepositoryData } from '@/lib/github';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { message: 'Repository URL is required' },
        { status: 400 }
      );
    }

    const repositoryData = await fetchRepositoryData(url);

    return NextResponse.json(repositoryData);
  } catch (error) {
    console.error('Error processing GitHub repository:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}