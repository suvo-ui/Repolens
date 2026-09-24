import { describe, expect, it, vi } from "vitest";
import {
  LlmCodeAnalysisService,
  LlmServiceError,
} from "../src/services/llm.service";

const validReport = {
  summary: "The selected files are small and straightforward.",
  architecture: {
    overview: "A small module with a direct export.",
    components: ["src/index.ts"],
    dataFlow: ["The module exports a constant."],
  },
  technologies: [
    { name: "TypeScript", purpose: "Static typing for the source." },
  ],
  strengths: [
    {
      category: "maintainability",
      description: "The module has a clear boundary.",
    },
  ],
  findings: [
    {
      title: "Missing boundary test",
      severity: "low",
      category: "testing",
      description: "The main path has no explicit boundary test.",
      recommendation: "Add a test for invalid input.",
      file: "src/index.ts",
    },
  ],
  improvements: [
    {
      priority: "low",
      title: "Add boundary coverage",
      description: "Add a test for invalid input.",
    },
  ],
  testingRecommendations: ["Add an invalid-input test."],
};

describe("LlmCodeAnalysisService", () => {
  it("sends selected files and validates a structured report", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: `\`\`\`json\n${JSON.stringify(validReport)}\n\`\`\``,
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const service = new LlmCodeAnalysisService(
      "https://llm.example.test/v1/chat/completions",
      "test-key",
      "test-model",
      request,
    );

    const report = await service.analyzeFiles([
      {
        path: "src/index.ts",
        content: "export const value = 1;",
        language: "typescript",
      },
    ]);

    expect(report).toEqual(validReport);
    expect(request).toHaveBeenCalledWith(
      "https://llm.example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );

    const requestBody = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(requestBody.model).toBe("test-model");
    expect(requestBody.messages[1].content).toContain("src/index.ts");
    expect(requestBody.messages[0].content).toContain(
      "Do not invent files, technologies",
    );
    expect(requestBody.messages[1].content).toContain('"architecture"');
  });

  it("rejects a report that does not match the schema", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ...validReport,
                  findings: [
                    {
                      ...validReport.findings[0],
                      severity: "critical",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const service = new LlmCodeAnalysisService(
      "https://llm.example.test",
      "test-key",
      "test-model",
      request,
    );

    await expect(
      service.analyzeFiles([
        { path: "src/index.ts", content: "const value = 1;" },
      ]),
    ).rejects.toMatchObject<Partial<LlmServiceError>>({
      name: "LlmServiceError",
    });
  });

  it("rejects empty source selections before calling the provider", async () => {
    const request = vi.fn<typeof fetch>();
    const service = new LlmCodeAnalysisService(
      "https://llm.example.test",
      "test-key",
      "test-model",
      request,
    );

    await expect(service.analyzeFiles([])).rejects.toThrow(
      "Invalid source files",
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects answer file paths outside the supplied repository context", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "Authentication is elsewhere.",
                  relevantFiles: ["src/not-supplied.ts"],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const service = new LlmCodeAnalysisService(
      "https://llm.example.test",
      "test-key",
      "test-model",
      request,
    );

    await expect(
      service.answerQuestion(
        "Where is authentication implemented?",
        [{ path: "src/auth.ts", content: "export function auth() {}" }],
        {
          repository: {
            id: 1,
            name: "repo",
            fullName: "owner/repo",
            private: false,
            htmlUrl: "https://github.com/owner/repo",
            description: null,
            defaultBranch: "main",
            language: "TypeScript",
            stargazersCount: 0,
            forksCount: 0,
            openIssuesCount: 0,
            watchersCount: 0,
            size: 1,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
            pushedAt: null,
          },
          analysisSummary: "A small repository.",
          architectureOverview: "One module.",
          selectedFilePaths: ["src/auth.ts"],
        },
      ),
    ).rejects.toThrow("outside the supplied repository context");
  });
});
