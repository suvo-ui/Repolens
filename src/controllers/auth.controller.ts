import type { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/auth.service";

export function createAuthController(authService: AuthService) {
  return {
    register: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const user = await authService.register(request.body);
        await establishSession(request, user.id);
        response.status(201).json({ user });
      } catch (error) {
        next(error);
      }
    },
    login: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const user = await authService.login(request.body);
        await establishSession(request, user.id);
        response.status(200).json({ user });
      } catch (error) {
        next(error);
      }
    },
    logout: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        await destroySession(request);
        response.clearCookie("repolens.sid");
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
    me: async (request: Request, response: Response) => {
      response.status(200).json({ user: request.user });
    },
  };
}

function establishSession(request: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }
      request.session.userId = userId;
      request.session.save((saveError) =>
        saveError ? reject(saveError) : resolve(),
      );
    });
  });
}

function destroySession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}
