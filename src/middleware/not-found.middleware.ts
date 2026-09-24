import { Request, Response } from "express";

export function notFoundHandler(request: Request, response: Response): void {
  response.status(404).json({
    error: "Not Found",
    path: request.originalUrl,
  });
}
