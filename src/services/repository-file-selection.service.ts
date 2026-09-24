import { RepositoryFile } from "../clients/github.client";

export interface FileSelectionLimits {
  maxFiles: number;
  maxTotalSize: number;
  maxFileSize: number;
}

export const defaultFileSelectionLimits: FileSelectionLimits = {
  maxFiles: 50,
  maxTotalSize: 500_000,
  maxFileSize: 100_000,
};

const ignoredDirectoryNames = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "out",
  "target",
  "vendor",
]);

const ignoredFileNames = new Set([
  "bun.lockb",
  "cargo.lock",
  "composer.lock",
  "gemfile.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "podfile.lock",
  "yarn.lock",
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
  "tif",
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

const prioritizedRootFiles = new Set([
  "package.json",
  "readme.md",
  "tsconfig.json",
]);

const prioritizedDirectoryNames = new Set([
  "app",
  "components",
  "controllers",
  "models",
  "pages",
  "routes",
  "server",
  "services",
  "src",
]);

export class RepositoryFileSelectionService {
  private readonly limits: FileSelectionLimits;

  constructor(limits: FileSelectionLimits = defaultFileSelectionLimits) {
    this.validateLimits(limits);
    this.limits = { ...limits };
  }

  selectFiles(repositoryFiles: RepositoryFile[]): RepositoryFile[] {
    const candidates = repositoryFiles
      .filter((file) => this.isSelectable(file))
      .sort((left, right) => {
        const priorityDifference =
          this.getPriority(left.path) - this.getPriority(right.path);
        return priorityDifference || left.path.localeCompare(right.path);
      });

    const selected: RepositoryFile[] = [];
    let totalSize = 0;

    for (const file of candidates) {
      if (selected.length >= this.limits.maxFiles) {
        break;
      }

      if (totalSize + file.size > this.limits.maxTotalSize) {
        continue;
      }

      selected.push(file);
      totalSize += file.size;
    }

    return selected;
  }

  private validateLimits(limits: FileSelectionLimits): void {
    for (const [name, value] of Object.entries(limits)) {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`${name} must be a non-negative integer`);
      }
    }
  }

  private isSelectable(file: RepositoryFile): boolean {
    return (
      file.size >= 0 &&
      file.size <= this.limits.maxFileSize &&
      !this.isIgnoredPath(file.path)
    );
  }

  private isIgnoredPath(path: string): boolean {
    const segments = path.split("/");
    const fileName = (segments.at(-1) ?? "").toLowerCase();

    if (
      segments
        .slice(0, -1)
        .some((segment) => ignoredDirectoryNames.has(segment.toLowerCase()))
    ) {
      return true;
    }

    if (ignoredFileNames.has(fileName)) {
      return true;
    }

    return this.isBinaryFile(fileName) || this.isGeneratedFile(fileName);
  }

  private isBinaryFile(fileName: string): boolean {
    const extension = fileName.includes(".")
      ? fileName.slice(fileName.lastIndexOf(".") + 1)
      : "";
    return binaryFileExtensions.has(extension);
  }

  private isGeneratedFile(fileName: string): boolean {
    return (
      fileName.includes("generated") ||
      fileName.includes("codegen") ||
      /\.(?:gen|min)\.[^.]+$/.test(fileName) ||
      fileName.endsWith(".map")
    );
  }

  private getPriority(path: string): number {
    const normalizedPath = path.toLowerCase();
    const fileName = normalizedPath.split("/").at(-1) ?? "";
    const segments = normalizedPath.split("/");

    if (segments.length === 1 && prioritizedRootFiles.has(fileName)) {
      return fileName === "readme.md" ? 0 : fileName === "package.json" ? 1 : 2;
    }

    if (this.isConfigurationFile(fileName)) {
      return 3;
    }

    if (segments.some((segment) => prioritizedDirectoryNames.has(segment))) {
      return 4;
    }

    return 5;
  }

  private isConfigurationFile(fileName: string): boolean {
    return (
      fileName.startsWith(".") ||
      fileName.includes("config") ||
      /\.(?:json|toml|ini|yaml|yml|xml)$/.test(fileName)
    );
  }
}
