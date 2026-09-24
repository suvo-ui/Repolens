import "express-serve-static-core";
import "express-session";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}
