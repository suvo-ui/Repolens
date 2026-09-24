import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("health endpoint", () => {
  it("reports that the API is running", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
