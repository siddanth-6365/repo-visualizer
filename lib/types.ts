export type ProcessingStatus = 'idle' | 'loading' | 'completed' | 'error';

export interface FileTree {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  content?: string;
  url: string;
}

export interface RepositoryData {
  name: string;
  owner: string;
  description: string;
  htmlUrl: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  fileTree?: FileTree[];
  readme?: string;
  visualization?: string;
  analysis?: string;
}

export interface VisualizationRequest {
  repositoryData: RepositoryData;
}

export interface VisualizationResponse {
  diagram: string;
  analysis: string;
}

export interface GitHubTreeResponse {
  tree: {
    path: string;
    mode: string;
    type: string;
    sha: string;
    size?: number;
    url: string;
  }[];
}

export interface GitHubRepoResponse {
  name: string;
  owner: {
    login: string;
  };
  description: string;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  topics: string[];
}