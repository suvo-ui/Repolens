import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env";
import { UserModel } from "../models/user.model";

const credentialsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export class AuthServiceError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 422, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuthServiceError";
    this.statusCode = statusCode;
  }
}

export class AuthService {
  async register(input: unknown): Promise<AuthUser> {
    const parsed = credentialsSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthServiceError(
        "Name, email, and a password of at least 12 characters are required",
      );
    }

    const passwordHash = await bcrypt.hash(
      parsed.data.password,
      env.passwordHashRounds,
    );
    try {
      const user = await UserModel.create({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
      });
      return this.toAuthUser(user);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new AuthServiceError("Email is already registered", 409);
      }
      throw new AuthServiceError("Unable to create account", 503, {
        cause: error,
      });
    }
  }

  async login(input: unknown): Promise<AuthUser> {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthServiceError("Invalid email or password", 401);
    }

    const user = await UserModel.findOne({ email: parsed.data.email })
      .select("+passwordHash")
      .exec();
    const passwordMatches = user
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : false;
    if (!user || !passwordMatches) {
      throw new AuthServiceError("Invalid email or password", 401);
    }

    return this.toAuthUser(user);
  }

  private toAuthUser(
    user: Pick<UserDocumentLike, "_id" | "name" | "email">,
  ): AuthUser {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
  }

  private isDuplicateKeyError(error: unknown): error is { code: 11000 } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === 11000
    );
  }
}

type UserDocumentLike = {
  _id: { toString(): string };
  name: string;
  email: string;
  passwordHash?: string;
};
