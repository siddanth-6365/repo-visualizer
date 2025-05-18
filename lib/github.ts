import { Octokit } from 'octokit';
import { RepositoryData, FileTree, GitHubTreeResponse, GitHubRepoResponse } from './types';

// Utility function to extract owner and repo from GitHub URL
export function extractRepoInfo(url: string): { owner: string; repo: string } {
  const pattern = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = url.match(pattern);
  
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  
  return {
    owner: match[1],
    repo: match[2].replace('.git', ''),
  };
}

// Fetch repository data from GitHub
export async function fetchRepositoryData(url: string): Promise<RepositoryData> {
  const { owner, repo } = extractRepoInfo(url);
  
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN, // Optional: better rate limits if provided
  });
  
  try {
    // Fetch repository information
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    }) as { data: GitHubRepoResponse };
    
    // Fetch file tree
    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: repoData.default_branch,
      recursive: 'true',
    }) as { data: GitHubTreeResponse };
    
    // Fetch README content if it exists
    let readme: string | undefined;
    try {
      const { data: readmeData } = await octokit.rest.repos.getReadme({
        owner,
        repo,
      });
      
      // Decode content from base64
      readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
    } catch (error) {
      // README may not exist, which is fine
      console.log('No README found or error fetching README');
    }
    
    // Convert the tree data to our FileTree format
    const fileTree: FileTree[] = treeData.tree
      .filter(item => item.type === 'blob' || item.type === 'tree')
      .map(item => ({
        name: item.path.split('/').pop() || item.path,
        path: item.path,
        type: item.type as 'blob' | 'tree',
        size: item.size,
        url: item.url,
      }));
    
    return {
      name: repoData.name,
      owner: repoData.owner.login,
      description: repoData.description || '',
      htmlUrl: repoData.html_url,
      defaultBranch: repoData.default_branch,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language || 'Unknown',
      topics: repoData.topics || [],
      fileTree,
      readme,
    };
  } catch (error) {
    console.error('Error fetching repository data:', error);
    throw new Error('Failed to fetch repository data from GitHub');
  }
}