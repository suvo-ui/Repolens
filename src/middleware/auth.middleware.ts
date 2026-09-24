import type { NextFunction, Request, Response } from "express";
import { UserModel } from "../models/user.model";
import type { AuthUser } from "../services/auth.service";

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const userId = request.session.userId;
  if (!userId) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const user = await UserModel.findById(userId)
      .select("_id name email")
      .lean();
    if (!user) {
      await destroySession(request);
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    request.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    } satisfies AuthUser;
    next();
  } catch (error) {
    next(error);
  }
}

function destroySession(request: Request): Promise<void> {
  return new Promise((resolve) => {
    request.session.destroy(() => resolve());
  });
}
