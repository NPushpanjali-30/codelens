export interface Profile {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AnalysisStatus = "idle" | "pending" | "analyzing" | "complete" | "failed";

export interface Repository {
  id: string;
  userId: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  description: string | null;
  owner: string;
  defaultBranch: string;
  language: string | null;
  githubUrl: string;
  private: boolean;
  stars: number;
  updatedAtGithub: string;
  analyzed: boolean;
  analysisStatus: AnalysisStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryFile {
  id: string;
  repositoryId: string;
  filePath: string;
  fileName: string;
  extension: string | null;
  language: string | null;
  fileSize: number;
  content: string | null;
  isImportant: boolean;
  createdAt: string;
}

export type DependencyType = "production" | "development";

export interface Dependency {
  id: string;
  repositoryId: string;
  name: string;
  version: string;
  dependencyType: DependencyType;
  sourceFile: string;
}

export interface CodeChunk {
  id: string;
  repositoryId: string;
  fileId: string;
  chunkText: string;
  startLine: number;
  endLine: number;
  symbolName: string | null;
  language: string | null;
  metadata: Record<string, unknown> | null;
}

export interface Analysis {
  id: string;
  repositoryId: string;
  projectOverview: string;
  technologyStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    frameworks: string[];
    libraries: string[];
    authentication: string[];
    apis: string[];
  };
  architecture: string;
  authentication: string;
  databaseInformation: string;
  importantFiles: { path: string; reason: string }[];
  apiInformation: ApiRoute[];
  dependenciesSummary: string;
  createdAt: string;
}

export type ComponentType =
  | "frontend"
  | "backend"
  | "database"
  | "external-api"
  | "auth"
  | "ai";

export interface ArchitectureComponent {
  id: string;
  repositoryId: string;
  componentName: string;
  componentType: ComponentType;
  description: string;
  relatedFiles: string[];
}

export interface ApiRoute {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  file: string;
  description: string;
  requiresAuth: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  repositoryId: string;
  title: string;
  createdAt: string;
}

export type ChatRole = "user" | "assistant";

export interface SourceReference {
  filePath: string;
  startLine: number;
  endLine: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  message: string;
  sources: SourceReference[];
  confident: boolean;
  createdAt: string;
}

export interface AIResponse {
  answer: string;
  relevantFiles: { path: string; reason: string }[];
  codeFlow: string[];
  sources: SourceReference[];
  confident: boolean;
}