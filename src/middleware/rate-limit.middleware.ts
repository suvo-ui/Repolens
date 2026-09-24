import type { NextFunction, Request, Response } from "express";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export function createRateLimiter({ windowMs, maxRequests }: RateLimitOptions) {
  const requests = new Map<string, number[]>();

  return function rateLimiter(
    request: Request,
    response: Response,
    next: NextFunction,
  ): void {
    const now = Date.now();
    const key = request.ip ?? "unknown";
    const recentRequests = (requests.get(key) ?? []).filter(
      (timestamp) => now - timestamp < windowMs,
    );

    if (recentRequests.length >= maxRequests) {
      response.status(429).json({
        error: "Too many requests. Please try again later.",
      });
      return;
    }

    recentRequests.push(now);
    requests.set(key, recentRequests);
    next();
  };
}
