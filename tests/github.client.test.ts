import { describe, expect, it, vi } from "vitest";
import { GitHubApiClient, GitHubApiError } from "../src/clients/github.client";

describe("GitHubApiClient", () => {
  it("retrieves and maps repository metadata", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 123,
          name: "analyser",
          full_name: "octocat/analyser",
          private: false,
          html_url: "https://github.com/octocat/analyser",
          description: "A repository",
          default_branch: "main",
          language: "TypeScript",
          stargazers_count: 10,
          forks_count: 2,
          open_issues_count: 1,
          watchers_count: 10,
          size: 42,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
          pushed_at: "2026-01-03T00:00:00Z",
        }),
        { status: 200 },
      ),
    );
    const client = new GitHubApiClient(
      "https://api.github.test/",
      "secret-token",
      request,
    );

    const metadata = await client.getRepositoryMetadata("octocat", "analyser");

    expect(metadata).toEqual({
      id: 123,
      name: "analyser",
      fullName: "octocat/analyser",
      private: false,
      htmlUrl: "https://github.com/octocat/analyser",
      description: "A repository",
      defaultBranch: "main",
      language: "TypeScript",
      stargazersCount: 10,
      forksCount: 2,
      openIssuesCount: 1,
      watchersCount: 10,
      size: 42,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      pushedAt: "2026-01-03T00:00:00Z",
    });
    expect(request).toHaveBeenCalledWith(
      "https://api.github.test/repos/octocat/analyser",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
        }),
      }),
    );
  });

  it("throws a status-aware error for GitHub API failures", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: "Not Found" }), { status: 404 }),
      );
    const client = new GitHubApiClient(
      "https://api.github.test",
      undefined,
      request,
    );

    await expect(
      client.getRepositoryMetadata("octocat", "missing"),
    ).rejects.toMatchObject<Partial<GitHubApiError>>({
      name: "GitHubApiError",
      message: "Not Found",
      status: 404,
    });
  });

  it("rejects blank owner or repository values before making a request", async () => {
    const request = vi.fn<typeof fetch>();
    const client = new GitHubApiClient(
      "https://api.github.test",
      undefined,
      request,
    );

    await expect(client.getRepositoryMetadata(" ", "repo")).rejects.toThrow(
      "owner is required",
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("retrieves a recursive tree and excludes generated and binary files", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 123,
            name: "analyser",
            full_name: "octocat/analyser",
            private: false,
            html_url: "https://github.com/octocat/analyser",
            description: null,
            default_branch: "main",
            language: "TypeScript",
            stargazers_count: 0,
            forks_count: 0,
            open_issues_count: 0,
            watchers_count: 0,
            size: 1,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            pushed_at: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            truncated: false,
            tree: [
              {
                path: "src/index.ts",
                type: "blob",
                sha: "sha-source",
                size: 100,
                url: "https://api.github.test/blob/source",
              },
              {
                path: "src/assets/logo.png",
                type: "blob",
                sha: "sha-image",
                size: 100,
                url: "https://api.github.test/blob/image",
              },
              {
                path: "node_modules/package/index.js",
                type: "blob",
                sha: "sha-dependency",
                size: 100,
                url: "https://api.github.test/blob/dependency",
              },
              {
                path: "build/output.js",
                type: "blob",
                sha: "sha-build",
                size: 100,
                url: "https://api.github.test/blob/build",
              },
              {
                path: "docs/readme.md",
                type: "blob",
                sha: "sha-tree",
                size: 100,
                url: "https://api.github.test/blob/readme",
              },
              {
                path: "src",
                type: "tree",
                sha: "sha-directory",
                url: "https://api.github.test/tree/src",
              },
            ],
          }),
          { status: 200 },
        ),
      );
    const client = new GitHubApiClient(
      "https://api.github.test",
      undefined,
      request,
    );

    await expect(
      client.getRepositoryFileTree("octocat", "analyser"),
    ).resolves.toEqual([
      {
        path: "src/index.ts",
        sha: "sha-source",
        size: 100,
        url: "https://api.github.test/blob/source",
      },
      {
        path: "docs/readme.md",
        sha: "sha-tree",
        size: 100,
        url: "https://api.github.test/blob/readme",
      },
    ]);
    expect(request).toHaveBeenLastCalledWith(
      "https://api.github.test/repos/octocat/analyser/git/trees/main?recursive=1",
      expect.any(Object),
    );
  });

  it("rejects an incomplete recursive tree", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 123,
            name: "analyser",
            full_name: "octocat/analyser",
            private: false,
            html_url: "https://github.com/octocat/analyser",
            description: null,
            default_branch: "main",
            language: null,
            stargazers_count: 0,
            forks_count: 0,
            open_issues_count: 0,
            watchers_count: 0,
            size: 1,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            pushed_at: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ truncated: true, tree: [] }), {
          status: 200,
        }),
      );
    const client = new GitHubApiClient(
      "https://api.github.test",
      undefined,
      request,
    );

    await expect(
      client.getRepositoryFileTree("octocat", "analyser"),
    ).rejects.toMatchObject({
      name: "GitHubApiError",
      message: "GitHub API returned an incomplete repository file tree",
    });
  });

  it("retrieves and decodes UTF-8 Base64 file content", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "file",
          encoding: "base64",
          content: Buffer.from("const message = 'héllo';\n", "utf8").toString(
            "base64",
          ),
        }),
        { status: 200 },
      ),
    );
    const client = new GitHubApiClient(
      "https://api.github.test/",
      "secret-token",
      request,
    );

    await expect(
      client.getFileContent("octocat", "analyser", "src/lib/index.ts"),
    ).resolves.toBe("const message = 'héllo';\n");
    expect(request).toHaveBeenCalledWith(
      "https://api.github.test/repos/octocat/analyser/contents/src/lib/index.ts",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
        }),
      }),
    );
  });

  it("handles GitHub API failures when retrieving a file", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: "Not Found" }), { status: 404 }),
      );
    const client = new GitHubApiClient(
      "https://api.github.test",
      undefined,
      request,
    );

    await expect(
      client.getFileContent("octocat", "missing", "src/index.ts"),
    ).rejects.toMatchObject<Partial<GitHubApiError>>({
      name: "GitHubApiError",
      message: "Not Found",
      status: 404,
    });
  });

  it("rejects malformed file content responses", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "file",
          encoding: "base64",
          content: "not-valid-base64!",
        }),
        { status: 200 },
      ),
    );
    const client = new GitHubApiClient(
      "https://api.github.test",
      undefined,
      request,
    );

    await expect(
      client.getFileContent("octocat", "analyser", "src/index.ts"),
    ).rejects.toMatchObject<Partial<GitHubApiError>>({
      name: "GitHubApiError",
      message: "GitHub API returned malformed Base64 file content",
      status: 200,
    });
  });

  it("rejects a directory response instead of treating it as a file", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ type: "dir", entries: [] }), {
        status: 200,
      }),
    );
    const client = new GitHubApiClient(
      "https://api.github.test",
      undefined,
      request,
    );

    await expect(
      client.getFileContent("octocat", "analyser", "src"),
    ).rejects.toMatchObject<Partial<GitHubApiError>>({
      name: "GitHubApiError",
      message: "The requested path is a directory, not a file",
      status: 200,
    });
  });
});
