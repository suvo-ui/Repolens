import type { NextFunction, Request, Response } from "express";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export function createRateLimiter({ windowMs, maxRequests }: RateLimitOptions) {
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    throw new Error("Rate limit window must be a positive integer");
  }
  if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
    throw new Error("Rate limit maximum must be a positive integer");
  }

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

    if (requests.size > 1000) {
      for (const [storedKey, timestamps] of requests) {
        if (timestamps.every((timestamp) => now - timestamp >= windowMs)) {
          requests.delete(storedKey);
        }
      }
    }

    if (recentRequests.length >= maxRequests) {
      response.setHeader(
        "Retry-After",
        Math.max(
          1,
          Math.ceil((windowMs - (now - (recentRequests[0] ?? now))) / 1000),
        ),
      );
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
