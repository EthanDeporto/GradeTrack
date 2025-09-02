import "express-session";
import type { User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      email: string | null;
      role: "teacher" | "admin" | "student" | null;
    };
  }
}
declare module "express-serve-static-core" {
  interface Request {
    user?: User; // Passport attaches user here
  }
}