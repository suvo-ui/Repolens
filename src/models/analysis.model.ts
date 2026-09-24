import { model, Schema, type Types } from "mongoose";
import { z } from "zod/v3";
import type {
  RepositoryFile,
  RepositoryMetadata,
} from "../clients/github.client";
import {
  codeAnalysisReportSchema,
  type CodeAnalysisReport,
} from "../services/llm.service";

const repositoryMetadataSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    fullName: z.string(),
    private: z.boolean(),
    htmlUrl: z.string().url(),
    description: z.string().nullable(),
    defaultBranch: z.string(),
    language: z.string().nullable(),
    stargazersCount: z.number(),
    forksCount: z.number(),
    openIssuesCount: z.number(),
    watchersCount: z.number(),
    size: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
    pushedAt: z.string().nullable(),
  })
  .strict();

const repositoryFileSchema = z
  .object({
    path: z.string().min(1),
    sha: z.string().min(1),
    size: z.number().nonnegative(),
    url: z.string().url(),
  })
  .strict();

export const persistedAnalysisSchema = z.object({
  userId: z.string().min(1),
  repositoryUrl: z.string().url(),
  owner: z.string().min(1),
  repositoryName: z.string().min(1),
  commitSha: z.string().nullable(),
  repository: repositoryMetadataSchema,
  selectedFiles: z.array(repositoryFileSchema),
  analyzedFiles: z.array(z.string().min(1)),
  analysis: codeAnalysisReportSchema,
  createdAt: z.date(),
});

export interface PersistedAnalysisInput {
  userId: string;
  repositoryUrl: string;
  owner: string;
  repositoryName: string;
  commitSha: string | null;
  repository: RepositoryMetadata;
  selectedFiles: RepositoryFile[];
  analyzedFiles: string[];
  analysis: CodeAnalysisReport;
  createdAt: Date;
}

export interface PersistedAnalysis extends PersistedAnalysisInput {
  _id: Types.ObjectId;
}

interface PersistedAnalysisDocument extends Omit<PersistedAnalysis, "userId"> {
  userId: Types.ObjectId;
}

export interface AnalysisHistoryItem {
  id: string;
  repositoryName: string;
  repositoryUrl: string;
  createdAt: Date;
  primaryLanguage: string | null;
  summary: string;
}

const analysisSchema = new Schema<PersistedAnalysisDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    repositoryUrl: { type: String, required: true, index: true },
    owner: { type: String, required: true, index: true },
    repositoryName: { type: String, required: true, index: true },
    commitSha: { type: String, default: null },
    repository: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, required: true, default: Date.now, index: true },
    selectedFiles: { type: Schema.Types.Mixed, required: true },
    analyzedFiles: { type: [String], required: true },
    analysis: { type: Schema.Types.Mixed, required: true },
  },
  { versionKey: false },
);

export const AnalysisModel = model<PersistedAnalysisDocument>(
  "Analysis",
  analysisSchema,
);
