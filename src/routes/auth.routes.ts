import { Router } from "express";
import { createAuthController } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { AuthService } from "../services/auth.service";

const authService = new AuthService();
const controller = createAuthController(authService);

export const authRouter = Router();

authRouter.post("/register", controller.register);
authRouter.post("/login", controller.login);
authRouter.post("/logout", controller.logout);
authRouter.get("/me", requireAuth, controller.me);
