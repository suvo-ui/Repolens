import { env } from "../config/env";

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

export interface GitHubClient {
  getRepositoryMetadata(
    owner: string,
    repository: string,
  ): Promise<RepositoryMetadata>;
  getRepositoryFileTree(
    owner: string,
    repository: string,
  ): Promise<RepositoryFile[]>;
  getFileContent(
    owner: string,
    repository: string,
    path: string,
  ): Promise<string>;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GitHubApiError";
  }
}

interface GitHubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
}

interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

interface GitHubFileContentResponse {
  type: "file" | "dir" | "symlink" | "submodule";
  encoding?: string;
  content?: string;
}

const ignoredDirectoryNames = new Set([
  "node_modules",
  ".git",
  "build",
  "coverage",
  "dist",
  ".next",
  "out",
  "target",
]);

const binaryFileExtensions = new Set([
  "7z",
  "avi",
  "bmp",
  "class",
  "dll",
  "dmg",
  "doc",
  "docx",
  "eot",
  "exe",
  "gif",
  "gz",
  "ico",
  "jar",
  "jpeg",
  "jpg",
  "mov",
  "mp3",
  "mp4",
  "otf",
  "pdf",
  "png",
  "rar",
  "so",
  "tar",
  "tiff",
  "ttf",
  "wav",
  "webm",
  "webp",
  "woff",
  "woff2",
  "xls",
  "xlsx",
  "zip",
]);

export class GitHubApiClient implements GitHubClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl = env.githubApiUrl,
    private readonly token = env.githubToken,
    private readonly request: typeof fetch = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async getRepositoryMetadata(
    owner: string,
    repository: string,
  ): Promise<RepositoryMetadata> {
    const normalizedOwner = this.requireSegment(owner, "owner");
    const normalizedRepository = this.requireSegment(repository, "repository");
    const endpoint = `${this.baseUrl}/repos/${encodeURIComponent(normalizedOwner)}/${encodeURIComponent(normalizedRepository)}`;

    const response = await this.requestWithTimeout(endpoint, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new GitHubApiError(
        await this.getErrorMessage(response),
        response.status,
      );
    }

    try {
      const payload = (await response.json()) as GitHubRepositoryResponse;
      return this.toRepositoryMetadata(payload);
    } catch (error) {
      throw new GitHubApiError(
        "GitHub API returned invalid repository metadata",
        response.status,
        { cause: error },
      );
    }
  }

  async getRepositoryFileTree(
    owner: string,
    repository: string,
  ): Promise<RepositoryFile[]> {
    const normalizedOwner = this.requireSegment(owner, "owner");
    const normalizedRepository = this.requireSegment(repository, "repository");
    const metadata = await this.getRepositoryMetadata(
      normalizedOwner,
      normalizedRepository,
    );
    const endpoint = `${this.baseUrl}/repos/${encodeURIComponent(normalizedOwner)}/${encodeURIComponent(normalizedRepository)}/git/trees/${encodeURIComponent(metadata.defaultBranch)}?recursive=1`;

    const response = await this.requestWithTimeout(endpoint, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new GitHubApiError(
        await this.getErrorMessage(response),
        response.status,
      );
    }

    let payload: GitHubTreeResponse;
    try {
      payload = (await response.json()) as GitHubTreeResponse;
    } catch (error) {
      throw new GitHubApiError(
        "GitHub API returned invalid repository file tree data",
        response.status,
        { cause: error },
      );
    }

    if (
      !payload ||
      !Array.isArray(payload.tree) ||
      typeof payload.truncated !== "boolean"
    ) {
      throw new GitHubApiError(
        "GitHub API returned invalid repository file tree data",
        response.status,
      );
    }

    if (payload.truncated) {
      throw new GitHubApiError(
        "GitHub API returned an incomplete repository file tree",
        response.status,
      );
    }

    return payload.tree
      .filter((entry) => entry.type === "blob")
      .filter((entry) => !this.isIgnoredPath(entry.path))
      .map((entry) => ({
        path: entry.path,
        sha: entry.sha,
        size: entry.size ?? 0,
        url: entry.url,
      }));
  }

  async getFileContent(
    owner: string,
    repository: string,
    path: string,
  ): Promise<string> {
    const normalizedOwner = this.requireSegment(owner, "owner");
    const normalizedRepository = this.requireSegment(repository, "repository");
    const normalizedPath = this.requireSegment(path, "path");
    const encodedPath = normalizedPath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const endpoint = `${this.baseUrl}/repos/${encodeURIComponent(normalizedOwner)}/${encodeURIComponent(normalizedRepository)}/contents/${encodedPath}`;

    const response = await this.requestWithTimeout(endpoint, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new GitHubApiError(
        await this.getErrorMessage(response),
        response.status,
      );
    }

    let payload: GitHubFileContentResponse;
    try {
      payload = await this.readJsonWithinLimit<GitHubFileContentResponse>(
        response,
        env.githubFileResponseMaxBytes,
      );
    } catch (error) {
      throw new GitHubApiError(
        "GitHub API returned invalid file content data",
        response.status,
        { cause: error },
      );
    }

    if (payload?.type === "dir") {
      throw new GitHubApiError(
        "The requested path is a directory, not a file",
        response.status,
      );
    }

    if (
      !payload ||
      payload.type !== "file" ||
      payload.encoding !== "base64" ||
      typeof payload.content !== "string"
    ) {
      throw new GitHubApiError(
        "GitHub API returned invalid file content data",
        response.status,
      );
    }

    try {
      return this.decodeBase64Content(payload.content);
    } catch (error) {
      throw new GitHubApiError(
        "GitHub API returned malformed Base64 file content",
        response.status,
        { cause: error },
      );
    }
  }

  private requireSegment(value: string, label: string): string {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      throw new GitHubApiError(`${label} is required`);
    }

    return normalizedValue;
  }

  private async requestWithTimeout(
    endpoint: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      env.githubRequestTimeoutMs,
    );

    try {
      return await this.request(endpoint, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new GitHubApiError("GitHub API request timed out", undefined, {
          cause: error,
        });
      }
      throw new GitHubApiError("Unable to reach the GitHub API", undefined, {
        cause: error,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async readJsonWithinLimit<T>(
    response: Response,
    maxBytes: number,
  ): Promise<T> {
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error(
        "GitHub file response exceeded the configured size limit",
      );
    }

    if (!response.body) {
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > maxBytes) {
        throw new Error(
          "GitHub file response exceeded the configured size limit",
        );
      }
      return JSON.parse(text) as T;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new Error(
            "GitHub file response exceeded the configured size limit",
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  }

  private decodeBase64Content(content: string): string {
    const normalizedContent = content.replace(/\s/g, "");
    if (
      !normalizedContent ||
      normalizedContent.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(normalizedContent)
    ) {
      throw new Error("Invalid Base64 content");
    }

    return Buffer.from(normalizedContent, "base64").toString("utf8");
  }

  private getHeaders(): HeadersInit {
    return {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "github-analyser",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private isIgnoredPath(path: string): boolean {
    const segments = path.split("/");
    if (
      segments.some((segment) =>
        ignoredDirectoryNames.has(segment.toLowerCase()),
      )
    ) {
      return true;
    }

    const fileName = segments.at(-1) ?? "";
    const extension = fileName.includes(".")
      ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
      : "";
    return binaryFileExtensions.has(extension);
  }

  private async getErrorMessage(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { message?: string };
      return (
        payload.message ??
        `GitHub API request failed with status ${response.status}`
      );
    } catch {
      return `GitHub API request failed with status ${response.status}`;
    }
  }

  private toRepositoryMetadata(
    repository: GitHubRepositoryResponse,
  ): RepositoryMetadata {
    return {
      id: repository.id,
      name: repository.name,
      fullName: repository.full_name,
      private: repository.private,
      htmlUrl: repository.html_url,
      description: repository.description,
      defaultBranch: repository.default_branch,
      language: repository.language,
      stargazersCount: repository.stargazers_count,
      forksCount: repository.forks_count,
      openIssuesCount: repository.open_issues_count,
      watchersCount: repository.watchers_count,
      size: repository.size,
      createdAt: repository.created_at,
      updatedAt: repository.updated_at,
      pushedAt: repository.pushed_at,
    };
  }
}
