export interface RepositoryMetadata {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  watchersCount: number;
  size: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
}

export interface RepositoryFile {
  path: string;
  sha: string;
  size: number;
  url: string;
}

export interface Architecture {
  overview: string;
  components: string[];
  dataFlow: string[];
}

export interface Technology {
  name: string;
  purpose: string;
}

export interface Strength {
  category: string;
  description: string;
}

export type Severity = "low" | "medium" | "high";
export type FindingCategory =
  | "security"
  | "performance"
  | "architecture"
  | "maintainability"
  | "testing"
  | "code-quality";

export interface Finding {
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  recommendation: string;
  file: string | null;
}

export interface Improvement {
  priority: Severity;
  title: string;
  description: string;
}

export interface CodeAnalysisReport {
  summary: string;
  architecture: Architecture;
  technologies: Technology[];
  strengths: Strength[];
  findings: Finding[];
  improvements: Improvement[];
  testingRecommendations: string[];
}

export interface AnalysisResult {
  analysisId?: string;
  repository: RepositoryMetadata;
  selectedFiles: RepositoryFile[];
  analyzedFiles: string[];
  analysis: CodeAnalysisReport;
}

export interface AnalysisHistoryItem {
  id: string;
  repositoryName: string;
  repositoryUrl: string;
  createdAt: string;
  primaryLanguage: string | null;
  summary: string;
}

export interface RepositoryQuestionAnswer {
  answer: string;
  relevantFiles: string[];
}

export interface AnalyzeRepositoryRequest {
  repositoryUrl: string;
}
