import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/models/user.model", () => {
  const users = new Map<
    string,
    { _id: string; name: string; email: string; passwordHash: string }
  >();
  const toDoc = (u: {
    _id: string;
    name: string;
    email: string;
    passwordHash: string;
  }) => ({
    ...u,
    _id: { toString: () => u._id },
  });
  return {
    UserModel: {
      create: vi.fn(async (input: Record<string, string>) => {
        if ([...users.values()].some((u) => u.email === input.email)) {
          const error = Object.assign(new Error("dup"), { code: 11000 });
          throw error;
        }
        const id = `user-${users.size + 1}`;
        const user = { _id: id, ...input } as never;
        users.set(id, user);
        return toDoc(user);
      }),
      findOne: vi.fn(({ email }: { email: string }) => ({
        select: () => ({
          exec: async () => {
            const found = [...users.values()].find((u) => u.email === email);
            return found ? toDoc(found) : null;
          },
        }),
      })),
      findById: vi.fn((id: string) => ({
        select: () => ({
          lean: async () => {
            const found = users.get(id);
            return found
              ? {
                  _id: { toString: () => found._id },
                  name: found.name,
                  email: found.email,
                }
              : null;
          },
        }),
      })),
    },
    __resetUsers: () => users.clear(),
  };
});

import * as userModule from "../src/models/user.model";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";

// Test-only export exposed by the vi.mock factory above.
const __resetUsers = (userModule as unknown as { __resetUsers?: () => void })
  .__resetUsers;

// Slow real bcrypt hashes would dominate test time; keep rounds low here.
process.env.PASSWORD_HASH_ROUNDS = "4";

const credentials = {
  name: "Test User",
  email: "test@example.com",
  password: "correct-horse-battery",
};

beforeEach(() => {
  vi.clearAllMocks();
  __resetUsers?.();
});

describe("auth flow", () => {
  it("registers a user and establishes a session", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/auth/register")
      .send(credentials);

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe("test@example.com");
    expect(response.headers["set-cookie"]).toBeDefined();

    // The session established by registration authenticates /me.
    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", response.headers["set-cookie"]);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({
      name: "Test User",
      email: "test@example.com",
    });
  });

  it("rejects duplicate registration with 409", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(credentials);
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...credentials, email: "other@example.com", name: "Other" });

    // Different email succeeds; same email is rejected as duplicate.
    expect(response.status).toBe(201);
    const dup = await request(app)
      .post("/api/auth/register")
      .send({ ...credentials, name: "Other" });
    expect(dup.status).toBe(409);
  });

  it("logs in and returns the authenticated user from /me", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(credentials);
    const login = await request(app).post("/api/auth/login").send({
      email: credentials.email,
      password: credentials.password,
    });

    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]).toBeDefined();

    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", login.headers["set-cookie"]);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(credentials.email);
  });

  it("rejects login with a wrong password (401)", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(credentials);
    const response = await request(app).post("/api/auth/login").send({
      email: credentials.email,
      password: "wrong-password-at-least-1",
    });

    expect(response.status).toBe(401);
  });

  it("destroys the session on logout", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(credentials);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });
    const cookie = login.headers["set-cookie"];

    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);
    expect(logout.status).toBe(204);

    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(401);
  });

  it("returns 401 for /me and protected analyze routes without a session", async () => {
    const app = createApp();
    const me = await request(app).get("/api/auth/me");
    expect(me.status).toBe(401);

    const analyze = await request(app)
      .post("/api/analyze")
      .send({ repoUrl: "https://github.com/example/repo" });
    expect(analyze.status).toBe(401);

    const analyses = await request(app).get("/api/analyses");
    expect(analyses.status).toBe(401);
  });

  it("populates request.user for authenticated protected routes", async () => {
    const app = createApp();
    const register = await request(app)
      .post("/api/auth/register")
      .send(credentials);
    const cookie = register.headers["set-cookie"];

    // /me echoes request.user which requireAuth populated from the session.
    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.body.user).toMatchObject({
      id: expect.any(String),
      name: "Test User",
      email: credentials.email,
    });
  });
});
