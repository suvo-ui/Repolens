import { describe, expect, it } from "vitest";
import { RepositoryFile } from "../src/clients/github.client";
import {
  RepositoryFileSelectionService,
  FileSelectionLimits,
} from "../src/services/repository-file-selection.service";

function file(path: string, size = 10): RepositoryFile {
  return {
    path,
    sha: `sha-${path}`,
    size,
    url: `https://api.github.test/blob/${path}`,
  };
}

describe("RepositoryFileSelectionService", () => {
  it("ignores excluded directories and generated files", () => {
    const service = new RepositoryFileSelectionService();

    const selected = service.selectFiles([
      file("node_modules/library/index.js"),
      file(".git/config"),
      file("dist/index.js"),
      file("build/index.js"),
      file("coverage/coverage.js"),
      file(".next/server.js"),
      file("vendor/library.js"),
      file("src/generated-client.ts"),
      file("src/schema.codegen.ts"),
      file("src/index.ts"),
    ]);

    expect(selected.map(({ path }) => path)).toEqual(["src/index.ts"]);
  });

  it("ignores binary files, media, fonts, and archives", () => {
    const service = new RepositoryFileSelectionService();

    const selected = service.selectFiles([
      file("assets/logo.png"),
      file("assets/demo.mp4"),
      file("assets/sound.mp3"),
      file("assets/font.woff2"),
      file("downloads/archive.zip"),
      file("docs/guide.pdf"),
      file("src/index.ts"),
    ]);

    expect(selected.map(({ path }) => path)).toEqual(["src/index.ts"]);
  });

  it("prioritizes important root files, configuration, and source directories", () => {
    const service = new RepositoryFileSelectionService({
      maxFiles: 20,
      maxTotalSize: 1_000,
      maxFileSize: 100,
    });

    const selected = service.selectFiles([
      file("misc/notes.txt"),
      file("src/index.ts"),
      file(".eslintrc.json"),
      file("package.json"),
      file("README.md"),
      file("tsconfig.json"),
      file("components/Button.tsx"),
    ]);

    expect(selected.map(({ path }) => path)).toEqual([
      "README.md",
      "package.json",
      "tsconfig.json",
      ".eslintrc.json",
      "components/Button.tsx",
      "src/index.ts",
      "misc/notes.txt",
    ]);
  });

  it("ignores appropriate lock files", () => {
    const service = new RepositoryFileSelectionService();

    const selected = service.selectFiles([
      file("package-lock.json"),
      file("pnpm-lock.yaml"),
      file("yarn.lock"),
      file("package.json"),
    ]);

    expect(selected.map(({ path }) => path)).toEqual(["package.json"]);
  });

  it("enforces maximum files, individual size, and total size", () => {
    const limits: FileSelectionLimits = {
      maxFiles: 2,
      maxTotalSize: 25,
      maxFileSize: 20,
    };
    const service = new RepositoryFileSelectionService(limits);

    const selected = service.selectFiles([
      file("README.md", 10),
      file("package.json", 20),
      file("src/too-large.ts", 21),
      file("src/within-total.ts", 10),
      file("misc/last.ts", 10),
    ]);

    expect(selected.map(({ path }) => path)).toEqual([
      "README.md",
      "src/within-total.ts",
    ]);

    const serviceWithTotalGap = new RepositoryFileSelectionService({
      maxFiles: 10,
      maxTotalSize: 25,
      maxFileSize: 20,
    });
    expect(
      serviceWithTotalGap
        .selectFiles([
          file("README.md", 20),
          file("src/small.ts", 5),
          file("src/skip.ts", 10),
        ])
        .map(({ path }) => path),
    ).toEqual(["README.md", "src/small.ts"]);
  });

  it("returns an empty selection for an empty repository", () => {
    const service = new RepositoryFileSelectionService();

    expect(service.selectFiles([])).toEqual([]);
  });
});
